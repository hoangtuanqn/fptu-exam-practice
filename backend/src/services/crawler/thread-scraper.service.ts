import * as cheerio from "cheerio";
import { sanitizeName, stripExt, uniqueName } from "../../utils/filename";
import type { FuoClient } from "./fuo-client";
import type { ImageRef, ThreadData } from "./types";

const IMAGE_SELECTOR = ".message-body img, .bbWrapper img, .message-attachments img, a.js-lbImage";
const MAX_PAGES = 30; // chặn vòng lặp phân trang bất thường

type RawImage = Omit<ImageRef, "fileBase">;

/** Tên gốc: ưu tiên `alt` ("Q1.jpg"), nếu không có thì suy ra từ URL attachments ("q1-jpg.263611"). */
function deriveName(alt: string | undefined, url: URL): string {
  if (alt && /\.[A-Za-z0-9]{2,5}$/.test(alt.trim())) return stripExt(alt.trim());

  const last = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
  const slug = last.replace(/\.\d+$/, ""); // "q1-jpg.263611" -> "q1-jpg"
  return stripExt(slug.replace(/-([A-Za-z0-9]{2,5})$/, ".$1"));
}

export function extractTitle(html: string): string {
  const $ = cheerio.load(html);
  const h1 = $("h1.p-title-value").first().clone();
  h1.find(".label, .labelLink, a.labelLink").remove(); // bỏ prefix như "Đề Thi FE"
  const title = h1.text().trim() || $("title").text().split("|")[0]?.trim() || "";
  return sanitizeName(title);
}

export function extractImages(html: string, baseUrl: string): RawImage[] {
  const $ = cheerio.load(html);
  const found = new Map<string, RawImage>(); // khử trùng theo pathname (href có token đổi mỗi lần)

  $(IMAGE_SELECTOR).each((_, el) => {
    const $el = $(el);
    const isImg = $el.is("img");
    if (isImg && $el.closest("a.js-lbImage").length) return; // sẽ xử lý ở thẻ <a>

    const $img = isImg ? $el : $el.find("img").first();
    // Ảnh gốc nằm ở link bao quanh (a.file-preview / lightbox); `src` chỉ là thumbnail
    const $link = isImg ? $el.closest('a[href*="/attachments/"]') : $el;
    const candidate = $link.attr("href") || $img.attr("data-url") || $img.attr("data-src") || $img.attr("src");
    if (!candidate || candidate.startsWith("data:")) return;

    try {
      const abs = new URL(candidate, baseUrl);
      if (/smilies|emoji/i.test(abs.href)) return;
      if (/\/(styles|data\/assets|js)\//.test(abs.pathname) && !/attachments/.test(abs.pathname)) return;
      if (found.has(abs.pathname)) return;

      const media = $link.attr("data-lb-sidebar-href");
      const mediaUrl = media ? new URL(media.replace(/\?lightbox=1$/, ""), baseUrl).href : undefined;
      found.set(abs.pathname, {
        url: abs.href,
        name: sanitizeName(deriveName($img.attr("alt"), abs), "image"),
        mediaUrl,
      });
    } catch {
      /* bỏ qua URL lỗi */
    }
  });

  return [...found.values()];
}

/** Người đăng và thời gian của bài đầu tiên trong trang. */
export function extractFirstPost(html: string): { author?: string; postedAt?: string } {
  const $ = cheerio.load(html);
  const first = $("article.message--post").first();
  if (!first.length) return {};
  return { author: first.attr("data-author") || undefined, postedAt: first.find("time").first().attr("datetime") };
}

/** Signature của thread: ưu tiên data-content-key ("thread-7094"), dự phòng đuôi số của canonical. */
export function extractThreadSignature(html: string): { threadId: string | null; canonicalUrl: string | null } {
  const $ = cheerio.load(html);
  const canonicalUrl = $("link[rel=canonical]").attr("href") ?? null;
  const key = $("html").attr("data-content-key") ?? $("[data-content-key]").first().attr("data-content-key");
  const threadId = key?.match(/^thread-(\d+)$/)?.[1] ?? canonicalUrl?.match(/\.(\d+)\/?(?:\?.*)?$/)?.[1] ?? null;
  return { threadId, canonicalUrl };
}

function findNextPage(html: string, currentUrl: string): string | null {
  const rel = cheerio.load(html)("a.pageNav-jump--next").attr("href");
  return rel ? new URL(rel, currentUrl).href : null;
}

/** Duyệt toàn bộ các trang của thread: title, signature, người đăng và danh sách ảnh (khử trùng lặp). */
export async function collectThread(client: FuoClient, startUrl: string): Promise<ThreadData> {
  const images = new Map<string, RawImage>();
  const visited = new Set<string>();
  let title = "";
  let signature: ReturnType<typeof extractThreadSignature> = { threadId: null, canonicalUrl: null };
  let firstPost: ReturnType<typeof extractFirstPost> = {};
  let next: string | null = startUrl;

  while (next && !visited.has(next) && visited.size < MAX_PAGES) {
    visited.add(next);
    const html: string = await (await client.fetchOk(next)).text();
    if (!title) {
      title = extractTitle(html);
      signature = extractThreadSignature(html);
      firstPost = extractFirstPost(html);
    }
    for (const img of extractImages(html, next)) images.set(new URL(img.url).pathname, img);
    next = findNextPage(html, next);
    if (next) await client.pause();
  }

  if (!images.size) {
    throw new Error(
      `Không tìm thấy ảnh nào trong "${title}". Có thể cookie hết hạn, Cloudflare chặn, hoặc thread không có ảnh.`,
    );
  }

  const used = new Set<string>();
  return {
    title: title || "untitled",
    threadId: signature.threadId,
    canonicalUrl: signature.canonicalUrl,
    author: firstPost.author,
    postedAt: firstPost.postedAt,
    images: [...images.values()].map((img) => ({ ...img, fileBase: uniqueName(img.name, used) })),
  };
}

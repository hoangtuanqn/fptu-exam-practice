import * as cheerio from "cheerio";
import { sanitizeName, stripExt, uniqueName } from "../../utils/filename";
import { isFuoHttpsUrl } from "../../utils/fuo-url";
import type { FuoClient } from "./fuo-client";
import type { FileRef, ImageRef, ThreadData } from "./types";

const IMAGE_SELECTOR = ".message-body img, .bbWrapper img, .message-attachments img, a.js-lbImage";
const FILE_SELECTOR = ".message-attachments li.file a.file-preview[href]";
const MAX_PAGES = 30; // chặn vòng lặp phân trang bất thường

type RawImage = Omit<ImageRef, "fileBase">;

// Tên kèm đuôi suy ra từ URL attachments: "/attachments/q1-jpg.263611/" -> "q1.jpg"
function nameFromUrl(url: URL): string {
  const last = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "");
  const slug = last.replace(/\.\d+$/, ""); // "q1-jpg.263611" -> "q1-jpg"
  return slug.replace(/-([A-Za-z0-9]{2,5})$/, ".$1");
}

/** Tên gốc: ưu tiên `alt` ("Q1.jpg"), nếu không có thì suy ra từ URL attachments ("q1-jpg.263611"). */
function deriveName(alt: string | undefined, url: URL): string {
  if (alt && /\.[A-Za-z0-9]{2,5}$/.test(alt.trim())) return stripExt(alt.trim());
  return stripExt(nameFromUrl(url));
}

// Chỉ nhận bài có nhãn (badge) này ở tiêu đề: <span class="label label--red">Đề Thi FE</span>
export const REQUIRED_LABEL = "Đề Thi FE";
const norm = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();

export function hasRequiredLabel(html: string): boolean {
  const $ = cheerio.load(html);
  return $("h1.p-title-value .label, h1.p-title-value .labelLink")
    .toArray()
    .some((el) => norm($(el).text()) === norm(REQUIRED_LABEL));
}

const QUESTION_NAME = /^Q\d+$/i;

/**
 * Tên file chuẩn là Q1, Q2... Ảnh nào đặt tên khác (vd "image", "IMG_0012") thì đổi theo thứ tự của ảnh trong thread
 * (ảnh thứ 3 -> Q3). Tên đúng chuẩn được giữ nguyên và giữ chỗ trước, nên tên mới không bao giờ đè lên chúng.
 */
export function normalizeQuestionNames(images: RawImage[]): RawImage[] {
  const used = new Set<string>();
  const kept = images.map((img) => (QUESTION_NAME.test(img.name) ? uniqueName(img.name, used) : null));
  return images.map((img, i) => {
    const name = kept[i] ?? uniqueName(`Q${i + 1}`, used);
    return { ...img, name };
  });
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

/** Tệp đính kèm không phải ảnh (li.file của mục "Đính kèm"); link nào extractImages đã lấy thì không tính lại. */
export function extractFiles(html: string, baseUrl: string): FileRef[] {
  const $ = cheerio.load(html);
  const images = new Set(extractImages(html, baseUrl).map((img) => new URL(img.url).pathname));
  const found = new Map<string, FileRef>(); // khử trùng theo pathname như ảnh

  $(FILE_SELECTOR).each((_, el) => {
    const $a = $(el);
    if ($a.is(".js-lbImage") || $a.find("img").length) return; // ảnh
    try {
      const abs = new URL($a.attr("href")!, baseUrl);
      // Chỉ link https của FuOverflow: lúc tải sẽ gửi kèm cookie admin
      if (!isFuoHttpsUrl(abs.href) || !abs.pathname.includes("/attachments/") || images.has(abs.pathname) || found.has(abs.pathname)) return;
      const $name = $a.closest("li.file").find(".file-name").first();
      const raw = ($name.attr("title") || $name.text()).trim();
      found.set(abs.pathname, { url: abs.href, name: sanitizeName(raw || nameFromUrl(abs), "file") });
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
  const files = new Map<string, FileRef>();
  const visited = new Set<string>();
  let title = "";
  let signature: ReturnType<typeof extractThreadSignature> = { threadId: null, canonicalUrl: null };
  let firstPost: ReturnType<typeof extractFirstPost> = {};
  let next: string | null = startUrl;

  while (next && !visited.has(next) && visited.size < MAX_PAGES) {
    visited.add(next);
    const html: string = await (await client.fetchOk(next)).text();
    if (!title) {
      if (!hasRequiredLabel(html)) {
        throw new Error(`Chỉ lấy được các bài có nhãn "${REQUIRED_LABEL}". Bài này không có nhãn đó nên không được lấy.`);
      }
      title = extractTitle(html);
      signature = extractThreadSignature(html);
      firstPost = extractFirstPost(html);
    }
    for (const img of extractImages(html, next)) images.set(new URL(img.url).pathname, img);
    for (const file of extractFiles(html, next)) files.set(new URL(file.url).pathname, file);
    next = findNextPage(html, next);
    if (next) await client.pause();
  }

  for (const path of images.keys()) files.delete(path); // ảnh ở trang này có thể hiện dạng tệp ở trang khác
  if (!images.size && !files.size) {
    throw new Error(
      `Không tìm thấy ảnh hay tệp đính kèm nào trong "${title}". Có thể cookie hết hạn hoặc Cloudflare chặn.`,
    );
  }

  const used = new Set<string>();
  const named = normalizeQuestionNames([...images.values()]);
  return {
    title: title || "untitled",
    threadId: signature.threadId,
    canonicalUrl: signature.canonicalUrl,
    author: firstPost.author,
    postedAt: firstPost.postedAt,
    images: named.map((img) => ({ ...img, fileBase: uniqueName(img.name, used) })),
    files: [...files.values()],
  };
}

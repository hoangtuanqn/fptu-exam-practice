import * as cheerio from "cheerio";
import { textOf } from "../../utils/html";
import { FUO_AUTH_MESSAGE, FuoAuthError, type FuoClient, FuoRateLimitError } from "./fuo-client";
import type { ImageRef, QuestionComments, ScrapedComment } from "./types";

const MAX_COMMENT_PAGES = 20;

export function extractComments(html: string, baseUrl: string): ScrapedComment[] {
  const $ = cheerio.load(html);
  return $("article.js-comment")
    .map((_, el): ScrapedComment => {
      const c = $(el);
      const id = (c.attr("data-content") ?? "").replace(/^xfmg-comment-/, "");
      const href = c.find('a[href^="/media/comments/"]').first().attr("href");
      return {
        id,
        author: c.attr("data-author") ?? "",
        time: c.find("time").first().attr("datetime") ?? "",
        authorScore: c.find(".user-fuo-vote").first().text().trim() || undefined,
        text: textOf($, c.find(".bbWrapper").first()),
        url: href ? new URL(href, baseUrl).href : `${baseUrl}#xfmg-comment-${id}`,
      };
    })
    .get();
}

/** Lấy toàn bộ bình luận của một trang media (đi qua các trang nếu có phân trang). */
export async function fetchMediaComments(client: FuoClient, mediaUrl: string): Promise<ScrapedComment[]> {
  const all: ScrapedComment[] = [];
  const visited = new Set<string>();
  let next: string | null = mediaUrl;

  while (next && !visited.has(next) && visited.size < MAX_COMMENT_PAGES) {
    visited.add(next);
    const html: string = await (await client.fetchOk(next)).text();
    all.push(...extractComments(html, next));
    const rel = cheerio.load(html)("a.pageNav-jump--next").attr("href");
    next = rel ? new URL(rel, next).href : null;
    if (next) await client.pause();
  }
  return all;
}

/**
 * Bình luận của một câu (ảnh). Lỗi thì trả danh sách rỗng: bình luận chỉ là phụ, không làm hỏng cả đề.
 */
// `rethrowAuth` (lượt bulk của admin): cookie hết hạn thì làm hỏng lần lấy đề (link về hàng chờ) thay vì ra đề không có bình luận
export async function collectComments(client: FuoClient, image: ImageRef, { rethrowAuth = false } = {}): Promise<QuestionComments> {
  let comments: ScrapedComment[] = [];
  if (image.mediaUrl) {
    try {
      comments = await fetchMediaComments(client, image.mediaUrl);
    } catch (err) {
      if (err instanceof FuoRateLimitError) throw err; // bị giới hạn: dừng cả lượt, không lấy tiếp các câu sau
      if (rethrowAuth && err instanceof FuoAuthError) throw new Error(FUO_AUTH_MESSAGE, { cause: err });
      /* bình luận chỉ là phụ, bỏ qua */
    }
  }
  return { image, comments };
}

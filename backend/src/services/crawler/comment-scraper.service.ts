import * as cheerio from "cheerio";
import { textOf } from "../../utils/html";
import type { FuoClient } from "./fuo-client";
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
async function fetchMediaComments(client: FuoClient, mediaUrl: string): Promise<ScrapedComment[]> {
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
 * Lấy bình luận cho từng câu (ảnh), tuần tự và có nghỉ giữa các request.
 * Lỗi ở một ảnh không làm hỏng cả đề: câu đó chỉ không có bình luận.
 */
export async function collectAllComments(
  client: FuoClient,
  images: ImageRef[],
  onProgress?: (done: number, total: number) => Promise<void> | void,
): Promise<QuestionComments[]> {
  const out: QuestionComments[] = [];
  for (const [i, image] of images.entries()) {
    let comments: ScrapedComment[] = [];
    if (image.mediaUrl) {
      try {
        comments = await fetchMediaComments(client, image.mediaUrl);
      } catch {
        /* bình luận chỉ là phụ, bỏ qua */
      }
      await client.pause();
    }
    out.push({ image, comments });
    await onProgress?.(i + 1, images.length);
  }
  return out;
}

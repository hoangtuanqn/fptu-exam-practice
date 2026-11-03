import type * as cheerio from "cheerio";

/** Chuyển một khối HTML (bbWrapper) thành text thuần, giữ xuống dòng, emoji -> ký tự, ảnh -> [ảnh: url]. */
export function textOf($: cheerio.CheerioAPI, $el: cheerio.Cheerio<any>): string {
  const c = $el.clone();
  c.find("img").each((_, img) => {
    const $img = $(img);
    const replacement = $img.hasClass("smilie")
      ? ($img.attr("alt") ?? "")
      : `[ảnh: ${$img.attr("data-url") || $img.attr("src") || ""}]`;
    $img.replaceWith(replacement);
  });
  c.find("br").replaceWith("\n");
  c.find("p, div, li, blockquote").each((_, e) => {
    $(e).append("\n");
  });
  return c
    .text()
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** "2026-05-04T11:31:15+0700" -> Date. Chèn dấu ":" vào múi giờ cho mọi runtime đọc được. */
export function parseSiteTime(iso: string | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  return Number.isNaN(date.getTime()) ? null : date;
}

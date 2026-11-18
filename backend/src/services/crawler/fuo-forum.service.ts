import type { ExamKind } from "@prisma/client";
import * as cheerio from "cheerio";
import { FUO_HOST } from "../../constants/crawler";
import { FUO_THREAD_LABEL_MAX, FUO_THREAD_TITLE_MAX } from "../../constants/fuo-catalog";
import { classifyKind } from "../../utils/exam-kind";
import { parseSiteTime } from "../../utils/html";

/**
 * Trang danh sách bài của một môn trên FuOverflow (XenForo 2.3, công khai): /forums/<mã môn>/ và /page-N, 20 bài mỗi trang.
 * Đọc thuần, không gọi mạng. FuOverflow đổi giao diện thì chỉ cần sửa file này (cùng cách đọc với tools/fuo-crawler/parser.js).
 */
export interface ForumRow {
  threadId: string;
  title: string;
  label: string | null; // nhãn gốc trên FuOverflow, ví dụ "Đề Thi FE"; null = bài không có nhãn
  kind: ExamKind;
  postedAt: Date | null;
  replies: number;
}

export interface ForumPage {
  isForum: boolean; // đúng là trang danh sách bài (không phải trang đăng nhập/lỗi)
  rows: ForumRow[];
  lastPage: number;
}

const THREAD_ID = /\/threads\/(?:[^/]*\.)?(\d{1,18})(?:\/|$)/;
export const SUBJECT_CODE = /^[A-Za-z]{2,4}\d{3}[A-Za-z]?$/; // tên diễn đàn của một môn trên FuOverflow, ví dụ PRJ301
const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

export const forumUrl = (code: string) => `https://${FUO_HOST}/forums/${encodeURIComponent(code)}/`;

// "12" -> 12, "1K" / "1,2K" -> 1000 / 1200 (XenForo rút gọn số lớn)
export function parseCount(text: string): number {
  const m = clean(text).match(/^([\d.,]+)\s*([KkMm])?$/);
  if (!m) return 0;
  if (!m[2]) return Number(m[1]!.replace(/\D/g, "")) || 0;
  const n = Number(m[1]!.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * (/k/i.test(m[2]) ? 1e3 : 1e6)) : 0;
}

export function parseForumPage(html: string): ForumPage {
  const $ = cheerio.load(html);
  const rows: ForumRow[] = [];
  $(".structItem--thread").each((_, el) => {
    const row = $(el);
    // Link tên bài là link /threads/ cuối cùng của tiêu đề (link nhãn trỏ về /forums/...?prefix_id=)
    const a = row.find(".structItem-title a[href*='/threads/']").last();
    const threadId = (a.attr("href") ?? "").match(THREAD_ID)?.[1];
    const title = clean(a.text()).slice(0, FUO_THREAD_TITLE_MAX);
    if (!threadId || !title) return;
    const label = clean(row.find(".structItem-title .label").first().text()).slice(0, FUO_THREAD_LABEL_MAX) || null;
    rows.push({
      threadId,
      title,
      label,
      kind: classifyKind(label, title),
      postedAt: parseSiteTime(row.find(".structItem-startDate time[datetime]").first().attr("datetime") ?? row.find("time.u-dt[datetime]").first().attr("datetime")),
      replies: parseCount(row.find(".structItem-cell--meta dd").first().text()),
    });
  });
  let lastPage = 1;
  $(".pageNav-main a").each((_, a) => {
    const n = Number(($(a).attr("href") ?? "").match(/page-(\d+)/)?.[1] ?? clean($(a).text()));
    if (Number.isInteger(n) && n > lastPage) lastPage = n;
  });
  return { isForum: $("html").attr("data-template") === "forum_view" || $(".structItemContainer").length > 0, rows, lastPage };
}

/** Trang chặn của Cloudflare hoặc trang đăng nhập thay cho trang cần đọc: coi như lỗi phiên FuOverflow. */
export function looksBlocked(html: string): boolean {
  const $ = cheerio.load(html);
  const title = clean($("title").text()).toLowerCase();
  const template = $("html").attr("data-template");
  return title.includes("just a moment") || title.includes("attention required") || $("#challenge-form, .cf-error-details").length > 0 || template === "login";
}

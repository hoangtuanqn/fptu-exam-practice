import { isRecentTerm } from "./term";

export interface ExamLite {
  threadId: string;
  title: string;
  postedAt: Date | null;
  term: string | null;
  status: "owned" | "ready" | "fetch";
  questions: number | null;
}
export type ExamRow = [title: string, term: string | null, status: ExamLite["status"], questions: number | null, postedAt: string | null, link: string];

/**
 * Chọn đề cho chatbot từ danh sách đã xếp mới nhất trước: lọc theo kỳ (hoặc chỉ các kỳ gần đây), cắt trang, dựng link.
 * Không còn đề kỳ gần đây nào thì trả vài đề mới nhất kèm ghi chú để bot nói thật.
 */
export function pickExams(items: ExamLite[], opts: { code: string; recent: boolean; term?: string; limit: number; offset: number; now?: Date }) {
  const needle = opts.term?.trim().toLowerCase();
  let list = needle ? items.filter((e) => e.term?.toLowerCase() === needle || e.title.toLowerCase().includes(needle)) : opts.recent ? items.filter((e) => isRecentTerm(e.term, opts.now)) : items;
  let note: "no_recent_exams" | undefined;
  if (!needle && opts.recent && list.length === 0 && items.length > 0) {
    list = items;
    note = "no_recent_exams";
  }
  const link = (e: ExamLite) => (e.status === "fetch" ? `/account/exams?tab=subject&subject=${encodeURIComponent(opts.code)}` : `/exam/${e.threadId}`);
  const rows = list.slice(opts.offset, opts.offset + opts.limit).map((e): ExamRow => [e.title, e.term, e.status, e.questions, e.postedAt ? e.postedAt.toISOString().slice(0, 10) : null, link(e)]);
  return { matched: list.length, ...(note && { note }), rows };
}

import { useSyncExternalStore } from "react";
import { adminApi, type ReviewCounts } from "@/features/admin/api/admin.api";
import { adminCommentApi } from "@/features/exam-comments/exam-comments.api";

// Số báo cáo đáp án, đánh giá lời giải AI, đề đóng góp và bình luận (chờ duyệt + bị báo cáo) chưa xử lý, hiện thành badge ở menu quản trị.
// Hỏi lại định kỳ khi tab đang mở; các trang gọi refreshReviewCounts() ngay sau khi xử lý một mục.
const POLL_MS = 60_000;

type Counts = ReviewCounts & { comments: number };
let counts: Counts = { reports: 0, feedback: 0, contributions: 0, comments: 0 };
const listeners = new Set<() => void>();
let stop: (() => void) | null = null;
let latest = 0; // chỉ nhận kết quả của lần hỏi mới nhất, tránh phản hồi cũ đến sau ghi đè số mới

export async function refreshReviewCounts() {
  const mine = ++latest;
  try {
    // Máy chủ cũ chưa có trang bình luận: coi như 0
    const [next, talk] = await Promise.all([adminApi.reviewCounts(), adminCommentApi.summary().catch(() => null)]);
    if (mine !== latest) return;
    const fresh = { reports: next.reports ?? 0, feedback: next.feedback ?? 0, contributions: next.contributions ?? 0, comments: (talk?.pending ?? 0) + (talk?.reported ?? 0) };
    if (fresh.reports === counts.reports && fresh.feedback === counts.feedback && fresh.contributions === counts.contributions && fresh.comments === counts.comments) return;
    counts = fresh;
    listeners.forEach((fn) => fn());
  } catch {
    /* giữ số cũ, lần sau hỏi lại */
  }
}

const visible = () => document.visibilityState === "visible";

function start() {
  const timer = setInterval(() => visible() && void refreshReviewCounts(), POLL_MS);
  const onVisible = () => visible() && void refreshReviewCounts();
  document.addEventListener("visibilitychange", onVisible);
  stop = () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

function subscribe(fn: () => void) {
  if (!stop) start();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) {
      stop?.();
      stop = null;
    }
  };
}

export const useReviewCounts = () => useSyncExternalStore(subscribe, () => counts);

import { useSyncExternalStore } from "react";
import { adminApi, type ReviewCounts } from "@/features/admin/api/admin.api";

// Số báo cáo đáp án, đánh giá lời giải AI và đề đóng góp chưa xử lý, hiện thành badge ở menu quản trị.
// Hỏi lại định kỳ khi tab đang mở; các trang gọi refreshReviewCounts() ngay sau khi xử lý một mục.
const POLL_MS = 60_000;

let counts: ReviewCounts = { reports: 0, feedback: 0, contributions: 0 };
const listeners = new Set<() => void>();
let stop: (() => void) | null = null;
let latest = 0; // chỉ nhận kết quả của lần hỏi mới nhất, tránh phản hồi cũ đến sau ghi đè số mới

export async function refreshReviewCounts() {
  const mine = ++latest;
  try {
    const next = await adminApi.reviewCounts();
    if (mine !== latest) return;
    const fresh = { reports: next.reports ?? 0, feedback: next.feedback ?? 0, contributions: next.contributions ?? 0 };
    if (fresh.reports === counts.reports && fresh.feedback === counts.feedback && fresh.contributions === counts.contributions) return;
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

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { EVENTS } from "@/shared/realtime/events";
import { isRealtimeConnected, onConnectionChange, onServerEvent } from "@/shared/realtime/socket";
import { examUploadApi, type UploadJob } from "./exam-upload.api";

const FALLBACK_POLL_MS = 5000; // chỉ dùng khi mất kết nối realtime và đang có lượt chờ/chạy
const DISMISSED_KEY = "fepass.examUploadDismissed";
const DISMISSED_MAX = 100; // chỉ nhớ bấy nhiêu mã gần nhất cho gọn
const loadDismissed = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
export const isActive = (j: UploadJob) => j.status === "QUEUED" || j.status === "RUNNING";

/**
 * Các lượt tải đề chạy nền của admin này. Tải một lần, nhận lượt vừa xong/lỗi qua socket, mất kết nối thì hỏi định kỳ GET /jobs.
 * `add(job)` sau khi máy chủ nhận đề (202). `onSaved` chạy khi một lượt xong để trang tải lại dữ liệu.
 */
export function useUploadJobs(onSaved?: () => void) {
  const toast = useToast();
  const query = useApi(() => examUploadApi.jobs(), []);
  const [live, setLive] = useState<UploadJob[] | null>(null);
  const [dismissed, setDismissed] = useState(loadDismissed);
  const all = live ?? query.data ?? [];
  const jobs = all.filter((j) => !j.uploadId || !dismissed.includes(j.uploadId));
  const running = jobs.some(isActive);
  const savedRef = useRef(onSaved);
  savedRef.current = onSaved;

  const upsert = useCallback(
    (job: UploadJob) =>
      setLive((prev) => {
        const list = prev ?? query.data ?? [];
        // Bản 202 đến muộn hơn sự kiện "xong" thì không được ghi đè lượt đã xong/lỗi
        const merge = (old: UploadJob) => (!isActive(old) && isActive(job) ? old : job);
        return list.some((j) => j.uploadId === job.uploadId) ? list.map((j) => (j.uploadId === job.uploadId ? merge(j) : j)) : [job, ...list];
      }),
    [query.data],
  );
  const refresh = useCallback(() => void examUploadApi.jobs().then(setLive).catch(() => undefined), []);

  // Lượt đang chờ/chạy chuyển sang Xong (từ socket hoặc hỏi định kỳ) thì báo trang tải lại
  const active = useRef(new Set<string>());
  useEffect(() => {
    let saved = false;
    for (const j of all) {
      if (!j.uploadId) continue;
      if (isActive(j)) active.current.add(j.uploadId);
      else if (active.current.delete(j.uploadId)) {
        // Báo kết quả ngay cả khi thẻ danh sách đang nằm ngoài tầm nhìn
        if (j.status === "DONE") {
          saved = true;
          toast.success(`Đã xử lý xong đề: ${j.title}`);
        } else if (j.status === "FAILED") toast.error(`Đề "${j.title}" xử lý lỗi: ${j.error ?? "không rõ nguyên nhân"}`);
      }
    }
    if (saved) savedRef.current?.();
  }, [all, toast]);

  useEffect(() => onServerEvent<UploadJob>(EVENTS.examUpload, upsert), [upsert]);

  useEffect(() => {
    if (!running) return;
    let poll: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      poll ??= setInterval(refresh, FALLBACK_POLL_MS);
    };
    const stop = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };
    const off = onConnectionChange((connected) => {
      if (!connected) return start();
      stop();
      refresh(); // bù các lượt đã xong trong lúc mất kết nối
    });
    if (!isRealtimeConnected()) start();
    return () => {
      off();
      stop();
    };
  }, [running, refresh]);

  // Máy chủ đã nhận đề (202). Máy chủ cũ không có hàng đợi thì đề đã lưu xong ngay
  const add = useCallback(
    (job: UploadJob) => {
      if (!job.uploadId) {
        // 0 câu chỉ có ở thư mục tài liệu (đề trắc nghiệm luôn có ít nhất 1 ảnh)
        toast.success(job.result?.questions === 0 ? `Đã lưu ${job.files} tệp tài liệu` : "Đã lưu đề");
        savedRef.current?.();
        return;
      }
      toast.success("Đã nhận đề, đang xử lý nền");
      upsert(job);
    },
    [toast, upsert],
  );

  // Chỉ ẩn lượt đã xong/lỗi (lượt đang chạy không xoá được). Máy chủ chỉ giữ lượt trong RAM nên ghi nhớ ở trình duyệt để tải lại trang không hiện lại
  const dismiss = useCallback((ids: string[]) => {
    setDismissed((prev) => {
      const next = [...new Set([...prev, ...ids])].slice(-DISMISSED_MAX);
      try {
        localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
      } catch {
        // trình duyệt chặn lưu trữ: vẫn ẩn trong phiên này
      }
      return next;
    });
  }, []);

  return { jobs, add, dismiss };
}

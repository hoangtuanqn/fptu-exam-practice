import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { EVENTS } from "@/shared/realtime/events";
import { isRealtimeConnected, onConnectionChange, onServerEvent } from "@/shared/realtime/socket";
import { examUploadApi, type UploadJob } from "./exam-upload.api";

const FALLBACK_POLL_MS = 5000; // chỉ dùng khi mất kết nối realtime và đang có lượt chờ/chạy
export const isActive = (j: UploadJob) => j.status === "QUEUED" || j.status === "RUNNING";

/**
 * Các lượt tải đề chạy nền của admin này. Tải một lần, nhận lượt vừa xong/lỗi qua socket, mất kết nối thì hỏi định kỳ GET /jobs.
 * `add(job)` sau khi máy chủ nhận đề (202). `onSaved` chạy khi một lượt xong để trang tải lại dữ liệu.
 */
export function useUploadJobs(onSaved?: () => void) {
  const toast = useToast();
  const query = useApi(() => examUploadApi.jobs(), []);
  const [live, setLive] = useState<UploadJob[] | null>(null);
  const jobs = live ?? query.data ?? [];
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
    for (const j of jobs) {
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
  }, [jobs, toast]);

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
      toast.success("Đã nhận, đang xử lý nền");
      upsert(job);
    },
    [toast, upsert],
  );

  // Xoá ở máy chủ rồi bỏ khỏi danh sách (một lượt, hoặc tất cả lượt đã xong/lỗi). Lượt đang chạy không xoá được
  const dismiss = useCallback(
    async (id?: string) => {
      try {
        await (id ? examUploadApi.removeJob(id) : examUploadApi.clearJobs());
        setLive((prev) => (prev ?? query.data ?? []).filter((j) => (id ? j.uploadId !== id : isActive(j))));
      } catch {
        toast.error("Chưa xoá được, bạn thử lại nhé");
      }
    },
    [query.data, toast],
  );

  return { jobs, add, dismiss };
}

import { useCallback, useEffect, useRef, useState } from "react";
import { importExam } from "@/features/exam-import/importExam";
import type { ImportedExam } from "@/features/exam-import/types";
import { errorMessage } from "@/shared/api/errors";
import { useLeaveWarning } from "@/shared/hooks/useLeaveWarning";

export type BatchStatus = "queued" | "running" | "done" | "failed";

export interface BatchItem {
  link: string;
  threadId: string;
  status: BatchStatus;
  stage: string | null; // dòng trạng thái thật của máy chủ ("Đang tải ảnh 12/50"...)
  error: string | null;
}

/**
 * Lấy nhiều đề từ nhiều link, lần lượt từng đề (máy chủ lấy đề từ FuOverflow có giới hạn tốc độ nên không chạy song song).
 * Mỗi đề xong là báo ngay qua `onImported` để đưa vào danh sách chọn; đề lỗi không làm dừng các đề sau và được hoàn phí tự động.
 */
export function useLinkBatch(subject: string, onImported: (exam: ImportedExam) => void, onEach?: () => void) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [running, setRunning] = useState(false);
  const alive = useRef(true);
  const abort = useRef(new AbortController());
  const imported = useRef(onImported);
  imported.current = onImported;
  const each = useRef(onEach);
  each.current = onEach;

  // Đang lấy đề mà đóng/tải lại trang: máy chủ vẫn lấy tiếp (đề vẫn vào kho) nhưng màn hình theo dõi tiến độ thì mất
  useLeaveWarning(running);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abort.current.abort();
    };
  }, []);

  const patch = (i: number, next: Partial<BatchItem>) => alive.current && setItems((cur) => cur.map((it, j) => (j === i ? { ...it, ...next } : it)));

  const run = useCallback(
    async (links: { link: string; threadId: string }[]) => {
      abort.current = new AbortController();
      setRunning(true);
      setItems(links.map((l) => ({ ...l, status: "queued", stage: null, error: null })));
      for (let i = 0; i < links.length; i++) {
        if (!alive.current) break;
        patch(i, { status: "running", stage: "Đang gửi yêu cầu" });
        try {
          const exam = await importExam(links[i]!.link, subject, (stage) => patch(i, { stage }), abort.current.signal);
          if (!alive.current) break;
          patch(i, { status: "done", stage: null });
          imported.current(exam);
        } catch (err) {
          if (!alive.current) break;
          patch(i, { status: "failed", stage: null, error: errorMessage(err) });
        }
        each.current?.(); // cập nhật số dư sau mỗi đề
      }
      if (alive.current) setRunning(false);
    },
    [subject],
  );

  const clear = useCallback(() => setItems([]), []);

  return { items, running, run, clear };
}

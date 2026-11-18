import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/shared/api/errors";
import { useLeaveWarning } from "@/shared/hooks/useLeaveWarning";
import { importExam } from "./importExam";
import type { ImportedExam } from "./types";

export type ImportPhase = "idle" | "running" | "done" | "failed";

// Gửi link đề lên server rồi nhận tiến trình realtime (socket) cho tới khi job xong.
// Server xử lý ở worker nền nên request gửi link trả về ngay, không treo giao diện.
export function useExamImport() {
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exam, setExam] = useState<ImportedExam | null>(null);
  // Đang lấy đề mà đóng/tải lại trang: server vẫn lấy tiếp (đề vẫn vào kho, không mất phí), nhưng màn hình theo dõi tiến độ thì mất
  useLeaveWarning(phase === "running");
  const alive = useRef(true);
  const runId = useRef(0);
  const abort = useRef(new AbortController()); // hủy việc chờ job khi bắt đầu lượt khác hoặc rời trang

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      abort.current.abort();
    };
  }, []);

  const start = useCallback(async (url: string, subject?: string, captchaToken?: string) => {
    abort.current.abort();
    abort.current = new AbortController();
    const mine = ++runId.current;
    const stale = () => !alive.current || mine !== runId.current; // đã rời trang hoặc đã bắt đầu lượt khác

    setPhase("running");
    setStage("Đang gửi yêu cầu");
    setError(null);
    setExam(null);

    const fail = (message: string) => {
      if (stale()) return;
      setError(message);
      setPhase("failed");
    };

    try {
      const loaded = await importExam(url, subject, (s) => !stale() && setStage(s), abort.current.signal, captchaToken);
      if (stale()) return;
      setExam(loaded);
      setPhase("done");
    } catch (err) {
      const message = errorMessage(err, "Chưa lấy được đề này, bạn thử lại nhé");
      fail(message);
    }
  }, []);

  const reset = useCallback(() => {
    runId.current++;
    abort.current.abort();
    setPhase("idle");
    setStage(null);
    setError(null);
    setExam(null);
  }, []);

  return { phase, stage, error, exam, start, reset };
}

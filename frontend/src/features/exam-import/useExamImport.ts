import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { examImportApi } from "./exam-import.api";
import { waitForJob } from "./jobLive";
import type { CrawlJob, ImportedExam } from "./types";

export type ImportPhase = "idle" | "running" | "done" | "failed";

const GIVE_UP_MS = 10 * 60 * 1000;

// Gửi link đề lên server rồi nhận tiến trình realtime (socket) cho tới khi job xong.
// Server xử lý ở worker nền nên request gửi link trả về ngay, không treo giao diện.
export function useExamImport() {
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null); // mã HTTP của lỗi (429 = khách hết lượt hôm nay)
  const [exam, setExam] = useState<ImportedExam | null>(null);
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

  const start = useCallback(async (url: string) => {
    abort.current.abort();
    abort.current = new AbortController();
    const mine = ++runId.current;
    const stale = () => !alive.current || mine !== runId.current; // đã rời trang hoặc đã bắt đầu lượt khác

    setPhase("running");
    setStage("Đang gửi yêu cầu");
    setError(null);
    setErrorStatus(null);
    setExam(null);

    const fail = (message: string, status: number | null = null) => {
      if (stale()) return;
      setError(message);
      setErrorStatus(status);
      setPhase("failed");
    };

    try {
      const result = await examImportApi.submit(url);
      let examId: number;

      if (result.existed) {
        examId = result.examId;
      } else {
        const stageText = (j: CrawlJob) =>
          j.status === "QUEUED"
            ? j.ahead > 0
              ? `Đang xếp hàng, còn ${j.ahead} lượt phía trước`
              : "Sắp tới lượt"
            : (j.stage ?? "Đang xử lý");
        setStage(stageText(result.job));
        // Tiến độ về qua socket, không cần hỏi liên tục
        const job = await waitForJob(result.job, (j) => !stale() && setStage(stageText(j)), abort.current.signal, GIVE_UP_MS);
        if (stale()) return;
        if (job.status === "FAILED" || job.examId === null) return fail(job.error ?? "Không nhập được đề này");
        examId = job.examId;
      }

      setStage("Đang mở đề");
      const loaded = await examImportApi.exam(examId);
      if (stale()) return;
      setExam(loaded);
      setPhase("done");
    } catch (err) {
      if (err instanceof ApiError) fail(err.message, err.status);
      else fail("Đã có lỗi xảy ra");
    }
  }, []);

  const reset = useCallback(() => {
    runId.current++;
    abort.current.abort();
    setPhase("idle");
    setStage(null);
    setError(null);
    setErrorStatus(null);
    setExam(null);
  }, []);

  return { phase, stage, error, errorStatus, exam, start, reset };
}

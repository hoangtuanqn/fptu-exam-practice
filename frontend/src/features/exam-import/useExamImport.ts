import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/shared/api/client";
import { examImportApi } from "./exam-import.api";
import type { ImportedExam } from "./types";

export type ImportPhase = "idle" | "running" | "done" | "failed";

const POLL_MS = 1500;
const GIVE_UP_MS = 10 * 60 * 1000;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Gửi link đề lên server rồi hỏi thăm tiến trình định kỳ (polling) cho tới khi job xong.
// Server xử lý ở worker nền nên request gửi link trả về ngay, không treo giao diện.
export function useExamImport() {
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null); // mã HTTP của lỗi (429 = khách hết lượt hôm nay)
  const [exam, setExam] = useState<ImportedExam | null>(null);
  const alive = useRef(true);
  const runId = useRef(0);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const start = useCallback(async (url: string) => {
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
        const deadline = Date.now() + GIVE_UP_MS;
        let job = result.job;
        while (job.status === "QUEUED" || job.status === "RUNNING") {
          if (stale()) return;
          if (Date.now() > deadline) return fail("Quá thời gian chờ, vui lòng thử lại sau");
          setStage(job.status === "QUEUED" ? "Đang chờ tới lượt" : (job.stage ?? "Đang xử lý"));
          await wait(POLL_MS);
          job = await examImportApi.job(job.id);
        }
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
    setPhase("idle");
    setStage(null);
    setError(null);
    setErrorStatus(null);
    setExam(null);
  }, []);

  return { phase, stage, error, errorStatus, exam, start, reset };
}

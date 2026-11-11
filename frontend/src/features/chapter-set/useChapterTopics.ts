import { useEffect, useMemo, useRef, useState } from "react";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import type { ChapterWaitStage } from "./ChapterWaitBanner";
import type { PickedExam } from "./types";

const POLL_MS = 4000;
const LABEL_POLL_MAX = 45; // gắn chương xong sau khi có đáp án (thường vài chục giây): chờ tối đa chừng này lần (khoảng 3 phút)
const SOLVE_MAX_MS = 15 * 60 * 1000; // AI phân tích đáp án có thể mất vài phút: chờ tối đa 15 phút

export interface ExamTopics {
  status: "loading" | "waiting" | "ready" | "error"; // waiting = đề mới lấy, AI chưa gắn chương xong
  stage: ChapterWaitStage;
  topicOf: Map<number, string | null>; // số câu -> chương
}

const topicsOf = (questions: { number: number; topic?: string | null; isReference?: boolean }[]) =>
  new Map(questions.filter((q) => !q.isReference).map((q) => [q.number, q.topic ?? null] as [number, string | null]));

/**
 * Chương của từng đề đã chọn. Đề đã có chương thì dùng ngay; đề mới lấy (AI chưa phân tích hoặc chưa gắn chương) thì hỏi lại định kỳ
 * cho tới khi có chương, AI báo lỗi, hoặc quá thời gian chờ (khi đó coi như đề không có chương, vẫn làm cả đề được).
 */
export function useChapterTopics(exams: PickedExam[]) {
  const [byExam, setByExam] = useState<Record<number, ExamTopics>>({});
  const requested = useRef(new Set<number>());
  const tracking = useRef(new Map<number, { tries: number; startedAt: number }>());
  const idsKey = exams.map((e) => e.id).join(",");

  const patch = (id: number, next: ExamTopics) => setByExam((cur) => ({ ...cur, [id]: next }));

  // Tải chi tiết từng đề lần đầu được chọn
  useEffect(() => {
    let alive = true;
    for (const { id } of exams) {
      if (requested.current.has(id)) continue;
      requested.current.add(id);
      patch(id, { status: "loading", stage: "labeling", topicOf: new Map() });
      examImportApi
        .exam(id)
        .then((full) => {
          if (!alive) return;
          const topicOf = topicsOf(full.questions);
          const has = [...topicOf.values()].some(Boolean);
          if (!has) tracking.current.set(id, { tries: 0, startedAt: Date.now() });
          patch(id, { status: has ? "ready" : "waiting", stage: full.answerStatus === "PENDING" ? "solving" : "labeling", topicOf });
        })
        .catch(() => alive && patch(id, { status: "error", stage: "labeling", topicOf: new Map() }));
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const waitingIds = useMemo(
    () => exams.filter((e) => byExam[e.id]?.status === "waiting").map((e) => e.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [idsKey, byExam],
  );
  const waitingKey = waitingIds.join(",");

  // Hỏi lại các đề đang chờ gắn chương
  useEffect(() => {
    if (waitingIds.length === 0) return;
    let alive = true;
    const give = (id: number, topicOf: Map<number, string | null>) => alive && patch(id, { status: "ready", stage: "labeling", topicOf });
    const tick = async () => {
      await Promise.all(
        waitingIds.map(async (id) => {
          const track = tracking.current.get(id) ?? { tries: 0, startedAt: Date.now() };
          tracking.current.set(id, track);
          try {
            const r = await examImportApi.answers(id);
            if (!alive) return;
            if (r.answers.some((a) => a.topic)) return give(id, new Map(r.answers.map((a) => [a.number, a.topic ?? null] as [number, string | null])));
            if (r.status === "FAILED") return give(id, new Map());
            if (r.status === "PENDING") {
              setByExam((cur) => (cur[id] ? { ...cur, [id]: { ...cur[id]!, stage: "solving" } } : cur)); // chưa có đáp án thì chưa gắn chương được: không tính vào số lần chờ gắn chương
              if (Date.now() - track.startedAt > SOLVE_MAX_MS) give(id, new Map());
              return;
            }
            setByExam((cur) => (cur[id] ? { ...cur, [id]: { ...cur[id]!, stage: "labeling" } } : cur));
          } catch {
            /* lần sau hỏi lại */
          }
          track.tries++;
          if (alive && track.tries >= LABEL_POLL_MAX) give(id, new Map());
        }),
      );
    };
    void tick();
    const timer = setInterval(() => void tick(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingKey]);

  const stateOf = (id: number): ExamTopics | undefined => byExam[id];
  const waiting = exams.some((e) => {
    const s = byExam[e.id]?.status;
    return s === undefined || s === "loading" || s === "waiting";
  });
  const stage: ChapterWaitStage = exams.some((e) => byExam[e.id]?.status === "waiting" && byExam[e.id]?.stage === "solving") ? "solving" : "labeling";

  // Chương gộp từ mọi đề đã sẵn sàng: tên chương -> số câu (cộng dồn)
  const chapters = useMemo(() => {
    const count = new Map<string, number>();
    for (const e of exams) {
      const s = byExam[e.id];
      if (s?.status !== "ready") continue;
      for (const t of s.topicOf.values()) if (t) count.set(t, (count.get(t) ?? 0) + 1);
    }
    return [...count.entries()].sort((a, b) => a[0].localeCompare(b[0], "vi", { numeric: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, byExam]);

  /** Số câu của một đề thuộc các chương đã chọn */
  const countIn = (id: number, picked: Set<string>) => {
    let n = 0;
    for (const t of byExam[id]?.topicOf.values() ?? []) if (t && picked.has(t)) n++;
    return n;
  };

  return { stateOf, waiting, stage, chapters, countIn };
}

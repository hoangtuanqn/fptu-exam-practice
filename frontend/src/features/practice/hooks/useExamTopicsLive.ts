import { useEffect, useRef, useState } from "react";
import { EVENTS } from "@/shared/realtime/events";
import { subscribeRoom } from "@/shared/realtime/socket";

interface TopicsPayload {
  examId: number;
  state: "running" | "done";
  topics: { number: number; topic: string }[];
}

const MAX_WAIT_MS = 3 * 60_000; // phòng khi tin "xong" không tới (mất kết nối): thôi hiện hiệu ứng chờ

/**
 * Đề còn câu chưa có chủ đề thì máy chủ gắn nền khi mở đề. Hook báo đang gắn hay chưa (để hiện hiệu ứng)
 * và trao các chủ đề mới ngay khi xong. Không cần hỏi định kỳ: kết quả đã lưu, lần mở sau tự có.
 */
export function useExamTopicsLive(examId: number | null, onTopics: (topics: TopicsPayload["topics"]) => void) {
  const [labeling, setLabeling] = useState(false);
  const handler = useRef(onTopics);
  handler.current = onTopics;

  useEffect(() => {
    setLabeling(false);
    if (examId === null) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const off = subscribeRoom<TopicsPayload>("exam", examId, EVENTS.examTopics, (p) => {
      if (p.examId !== examId) return;
      clear();
      if (p.state === "running") {
        setLabeling(true);
        timer = setTimeout(() => setLabeling(false), MAX_WAIT_MS);
        return;
      }
      setLabeling(false);
      if (p.topics.length > 0) handler.current(p.topics);
    });
    return () => {
      clear();
      off();
    };
  }, [examId]);

  return labeling;
}

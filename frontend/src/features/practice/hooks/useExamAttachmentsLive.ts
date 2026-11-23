import { useEffect, useState } from "react";
import type { ExamAttachment, ExamAttachmentsPayload } from "@/features/exam/types";
import { EVENTS } from "@/shared/realtime/events";
import { subscribeRoom } from "@/shared/realtime/socket";

/**
 * Tệp đính kèm của đề, cập nhật qua socket khi đề còn đang được lấy về (vd. tệp zip của đề PE đến sau).
 * Không hỏi định kỳ: server gửi lại danh sách mỗi khi vào lại phòng sau khi mất kết nối.
 */
export function useExamAttachmentsLive(examId: string | null, initial: ExamAttachment[] | undefined): ExamAttachment[] {
  // Gắn danh sách với id đề để đổi sang đề khác không hiện tệp của đề cũ
  const [live, setLive] = useState<{ examId: string | null; list: ExamAttachment[] }>({ examId, list: initial ?? [] });

  // Đề được tải lại (hoặc đổi đề): lấy danh sách mới nếu nhiều tệp hơn
  useEffect(() => {
    if (initial) setLive((prev) => (prev.examId !== examId || initial.length > prev.list.length ? { examId, list: initial } : prev));
  }, [examId, initial]);

  useEffect(() => {
    if (examId === null) return;
    return subscribeRoom<ExamAttachmentsPayload>("exam", examId, EVENTS.examAttachments, (p) => {
      if (p.examId === examId) setLive({ examId, list: p.attachments });
    });
  }, [examId]);

  return examId !== null && live.examId === examId ? live.list : (initial ?? []);
}

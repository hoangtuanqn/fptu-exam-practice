import type { Server } from "socket.io";
import { crawlJobRepository } from "../repositories/crawl-job.repository";
import { examRepository } from "../repositories/exam.repository";
import { toJobDto } from "../services/crawl-job.dto";
import { toAnswersPayload } from "../utils/exam-answers";
import { EVENTS, roomOf, type RoomKind } from "./events";

/**
 * Điểm phát sự kiện realtime cho phần còn lại của server. Dịch vụ nghiệp vụ chỉ gọi `publishExam` / `publishJob`,
 * không biết gì về socket. Chưa khởi tạo (ví dụ khi test) hoặc không có ai đang theo dõi thì không làm gì cả.
 */
let io: Server | null = null;

const hasListeners = (kind: RoomKind, id: number) => (io?.sockets.adapter.rooms.get(roomOf(kind, id))?.size ?? 0) > 0;

export const examPayload = async (examId: number) => {
  const exam = await examRepository.findAnswers(examId);
  return exam ? { examId, ...toAnswersPayload(exam) } : null;
};

export const jobPayload = async (jobId: number) => {
  const job = await crawlJobRepository.findById(jobId);
  if (!job) return null;
  return toJobDto(job, job.status === "QUEUED" ? await crawlJobRepository.countAhead(job.id) : 0);
};

export const realtimeHub = {
  attach(server: Server) {
    io = server;
  },

  // Đáp án của đề vừa đổi (AI xong, lỗi, hoặc bắt đầu giải lại)
  async publishExam(examId: number) {
    if (!io || !hasListeners("exam", examId)) return;
    const payload = await examPayload(examId).catch(() => null);
    if (payload) io.to(roomOf("exam", examId)).emit(EVENTS.examAnswers, payload);
  },

  // Tiến độ lấy đề vừa đổi (sang bước mới, xong, hoặc lỗi)
  async publishJob(jobId: number) {
    if (!io || !hasListeners("job", jobId)) return;
    const payload = await jobPayload(jobId).catch(() => null);
    if (payload) io.to(roomOf("job", jobId)).emit(EVENTS.jobUpdate, payload);
  },
};

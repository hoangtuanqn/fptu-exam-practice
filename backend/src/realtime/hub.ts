import type { Server } from "socket.io";
import { examAttachmentRepository } from "../repositories/exam-attachment.repository";
import { examRepository } from "../repositories/exam.repository";
import { toAnswersPayload } from "../utils/exam-answers";
import { fileUrlOf, toAttachmentDto } from "../utils/file-url";
import { ADMIN_ROOM, EVENTS, MEMBERS_ROOM, roomOf, userRoom, type RoomKind } from "./events";

/**
 * Điểm phát sự kiện realtime cho phần còn lại của server. Dịch vụ nghiệp vụ chỉ gọi các hàm `publish...`,
 * không biết gì về socket. Chưa khởi tạo (ví dụ khi test) hoặc không có ai đang theo dõi thì không làm gì cả.
 */
let io: Server | null = null;

const hasListeners = (kind: RoomKind, id: string | number) => (io?.sockets.adapter.rooms.get(roomOf(kind, id))?.size ?? 0) > 0;

export const examPayload = async (examId: string) => {
  const exam = await examRepository.findAnswers(examId);
  return exam ? { examId, ...toAnswersPayload(exam) } : null;
};

// Các câu đã có ảnh của đề đang được lấy về (null nếu đề đã đủ câu hoặc không còn)
export const questionsPayload = async (examId: string) => {
  const exam = await examRepository.findLoadedQuestions(examId);
  if (!exam) return null;
  return {
    examId,
    total: exam.totalQuestions,
    questions: exam.questions.map((q) => ({ number: q.number, imageUrl: fileUrlOf(q.imagePath), correct: [] as string[] })),
  };
};

// Toàn bộ tệp đính kèm hiện có của đề, cùng dạng với attachments của GET đề
export const attachmentsPayload = async (examId: string) => ({
  examId,
  attachments: (await examAttachmentRepository.list(examId)).map((a) => toAttachmentDto(examId, a)),
});

export const realtimeHub = {
  attach(server: Server) {
    io = server;
  },

  // Đáp án của đề vừa đổi (AI xong, lỗi, hoặc bắt đầu giải lại)
  async publishExam(examId: string) {
    if (!io || !hasListeners("exam", examId)) return;
    const payload = await examPayload(examId).catch(() => null);
    if (payload) io.to(roomOf("exam", examId)).emit(EVENTS.examAnswers, payload);
  },

  // Có thêm câu vừa tải xong: gửi toàn bộ các câu đã có (giao diện gộp theo số câu nên nhận lặp cũng không sao)
  async publishExamQuestions(examId: string) {
    if (!io || !hasListeners("exam", examId)) return;
    const payload = await questionsPayload(examId).catch(() => null);
    if (payload) io.to(roomOf("exam", examId)).emit(EVENTS.examQuestions, payload);
  },

  // Danh sách tệp đính kèm vừa đổi: gửi cả danh sách, giao diện thay hẳn danh sách cũ
  async publishExamAttachments(examId: string) {
    if (!io || !hasListeners("exam", examId)) return;
    const payload = await attachmentsPayload(examId).catch(() => null);
    if (payload) io.to(roomOf("exam", examId)).emit(EVENTS.examAttachments, payload);
  },

  // Gắn chủ đề chạy nền: "running" khi bắt đầu, "done" kèm các chủ đề vừa gắn khi xong (hoặc không gắn được)
  publishExamTopics(examId: string, state: "running" | "done", topics: { number: number; topic: string }[] = []) {
    if (!io) return;
    io.to(roomOf("exam", examId)).emit(EVENTS.examTopics, { examId, state, topics });
  },

  // Thông báo mới cho admin (đã ghi DB): đẩy cho các admin đang mở trang quản trị
  publishAdminNotice(notice: unknown) {
    io?.to(ADMIN_ROOM).emit(EVENTS.adminNotice, notice);
  },

  // Thành viên này có đang mở trang (có kết nối) không: không ai nghe thì khỏi chuẩn bị gì
  hasUser(userId: string) {
    return (io?.sockets.adapter.rooms.get(userRoom(userId))?.size ?? 0) > 0;
  },

  // Thông báo mới của một thành viên (đã commit): đẩy cho mọi tab đang mở của người đó
  publishUserNotice(userId: string, notice: unknown) {
    io?.to(userRoom(userId)).emit(EVENTS.userNotice, notice);
  },

  // Vừa gửi thông báo hệ thống: báo mọi thành viên đang online tải lại chuông (một lần cho cả server, không duyệt người dùng)
  publishUserNoticeSync() {
    io?.to(MEMBERS_ROOM).emit(EVENTS.userNoticeSync);
  },

  // Lượt tải đề chạy nền vừa xong hoặc lỗi: chỉ báo cho admin đã gửi (mọi tab của người đó)
  publishExamUpload(adminId: string, job: unknown) {
    io?.to(userRoom(adminId)).emit(EVENTS.examUpload, job);
  },

  // Ai đang online vừa đổi: chỉ báo "có thay đổi", admin tự tải lại danh sách
  publishPresence() {
    io?.to(ADMIN_ROOM).emit(EVENTS.presence);
  },
};

// Tên sự kiện kênh realtime, trùng với backend/src/realtime/events.ts
export const SOCKET_PATH = "/api/v1/socket";

export const EVENTS = {
  subscribe: "subscribe",
  unsubscribe: "unsubscribe",
  examAnswers: "exam:answers", // trạng thái + đáp án của đề
  examQuestions: "exam:questions", // các câu đã có ảnh (đề đang được lấy về)
  examTopics: "exam:topics", // gắn chủ đề chạy nền: đang chạy / xong
  examFailed: "exam:failed", // lấy đề thất bại giữa chừng
  jobUpdate: "job:update", // tiến độ lấy đề
} as const;

export type RoomKind = "exam" | "job";

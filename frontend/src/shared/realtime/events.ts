// Tên sự kiện kênh realtime, trùng với backend/src/realtime/events.ts
export const SOCKET_PATH = "/api/v1/socket";

export const EVENTS = {
  subscribe: "subscribe",
  unsubscribe: "unsubscribe",
  examAnswers: "exam:answers", // trạng thái + đáp án của đề
  jobUpdate: "job:update", // tiến độ lấy đề
} as const;

export type RoomKind = "exam" | "job";

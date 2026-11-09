// Tên sự kiện và phòng của kênh realtime (socket.io). Giao diện dùng cùng tên ở shared/realtime/events.ts.
export const SOCKET_PATH = "/api/v1/socket";

export const EVENTS = {
  subscribe: "subscribe", // client -> server: { room: "exam" | "job", id }
  unsubscribe: "unsubscribe",
  examAnswers: "exam:answers", // server -> client: trạng thái + đáp án của đề
  examQuestions: "exam:questions", // server -> client: các câu đã có ảnh (đề đang được lấy về, hiện dần)
  examTopics: "exam:topics", // server -> client: việc gắn chủ đề chạy nền (đang chạy / xong kèm các chủ đề mới)
  examFailed: "exam:failed", // server -> client: lấy đề thất bại giữa chừng, đề bị gỡ
  jobUpdate: "job:update", // server -> client: tiến độ lấy đề
} as const;

export type RoomKind = "exam" | "job";
export const roomOf = (kind: RoomKind, id: number) => `${kind}:${id}`;

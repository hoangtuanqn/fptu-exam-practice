// Tên sự kiện và phòng của kênh realtime (socket.io). Giao diện dùng cùng tên ở shared/realtime/events.ts.
export const SOCKET_PATH = "/api/v1/socket";

export const EVENTS = {
  subscribe: "subscribe", // client -> server: { room: "exam", id: uuid string } | { room: "job", id: number }
  unsubscribe: "unsubscribe",
  examAnswers: "exam:answers", // server -> client: trạng thái + đáp án của đề
  examQuestions: "exam:questions", // server -> client: các câu đã có ảnh (đề đang được lấy về, hiện dần)
  examTopics: "exam:topics", // server -> client: việc gắn chủ đề chạy nền (đang chạy / xong kèm các chủ đề mới)
  examAttachments: "exam:attachments", // server -> client: danh sách tệp đính kèm của đề, gửi khi danh sách đổi (đề đang được lấy về)
  examFailed: "exam:failed", // server -> client: lấy đề thất bại giữa chừng, đề bị gỡ
  jobUpdate: "job:update", // server -> client: tiến độ lấy đề
  adminNotice: "admin:notice", // server -> client (chỉ admin): có thông báo mới về hành vi người dùng
  fuoCatalog: "admin:fuo-catalog", // server -> client (chỉ admin): tiến độ lượt quét danh mục FuOverflow, cùng dạng GET /admin/fuo-catalog/status
  fuoSources: "admin:fuo-sources", // server -> client (chỉ admin): tiến độ lượt nạp dữ liệu FuOverflow, cùng dạng GET /admin/fuo-sources/status
} as const;

export type RoomKind = "exam" | "job";
// Phòng của mọi admin đang online: nhận thông báo mới ngay
export const ADMIN_ROOM = "admins";
export const roomOf = (kind: RoomKind, id: string | number) => `${kind}:${id}`;

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
  examUpload: "admin:exam-upload", // server -> client (chính admin đã gửi): lượt tải đề chạy nền vừa xong/lỗi, cùng dạng một mục của GET /admin/exam-upload/jobs
  presence: "admin:presence", // server -> client (chỉ admin): có người vào/ra/đổi trang, không kèm dữ liệu, tải lại GET /admin/presence
  presencePage: "presence:page", // client -> server: trang đang xem, ví dụ "/account/attempts"
  userNotice: "user:notice", // server -> client (chính thành viên đó): thông báo mới, cùng dạng một mục của GET /notifications
  userNoticeSync: "user:notice-sync", // server -> client (mọi thành viên đã đăng nhập): không kèm dữ liệu, tải lại thông báo (sau khi gửi thông báo hệ thống)
} as const;

export type RoomKind = "exam" | "job";
// Phòng của mọi admin đang online: nhận thông báo mới ngay
export const ADMIN_ROOM = "admins";
// Phòng riêng của một thành viên (tự vào khi kết nối, không đăng ký qua "subscribe")
export const userRoom = (userId: string) => `user:${userId}`;
// Phòng chung của mọi thành viên đã đăng nhập (mỗi socket một lần, khách không vào)
export const MEMBERS_ROOM = "members";
export const roomOf = (kind: RoomKind, id: string | number) => `${kind}:${id}`;

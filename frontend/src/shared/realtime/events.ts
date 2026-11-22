// Tên sự kiện kênh realtime, trùng với backend/src/realtime/events.ts
export const SOCKET_PATH = "/api/v1/socket";

export const EVENTS = {
  subscribe: "subscribe",
  unsubscribe: "unsubscribe",
  examAnswers: "exam:answers", // trạng thái + đáp án của đề
  examQuestions: "exam:questions", // các câu đã có ảnh (đề đang được lấy về)
  examAttachments: "exam:attachments", // danh sách tệp đính kèm của đề (gửi lại mỗi khi đổi)
  examTopics: "exam:topics", // gắn chủ đề chạy nền: đang chạy / xong
  examFailed: "exam:failed", // lấy đề thất bại giữa chừng
  jobUpdate: "job:update", // tiến độ lấy đề
  adminNotice: "admin:notice", // (chỉ admin) thông báo mới về hành vi người dùng
  fuoSources: "admin:fuo-sources", // (chỉ admin) tiến độ lượt nạp dữ liệu FuOverflow, cùng dạng GET /admin/fuo-sources/status
  presence: "admin:presence", // (chỉ admin) có người vào/ra/đổi trang: không kèm dữ liệu, tải lại GET /admin/presence
  presencePage: "presence:page", // gửi lên server: trang đang xem
  userNotice: "user:notice", // (chính thành viên đó) thông báo mới, cùng dạng một mục của GET /notifications
  userNoticeSync: "user:notice-sync", // (mọi thành viên đã đăng nhập) không kèm dữ liệu: tải lại thông báo
} as const;

export type RoomKind = "exam" | "job";

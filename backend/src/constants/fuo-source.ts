// Danh sách link đề FuOverflow do admin dán vào và lượt "nạp dữ liệu mới" chạy nền trên toàn bộ danh sách
export const FUO_SOURCE_CONCURRENCY = 1; // số link xử lý cùng lúc (vừa phải: mỗi luồng vẫn nghỉ giữa các link, không dồn request sang FuOverflow)
export const FUO_SOURCE_PAUSE_MS = 5000; // nghỉ giữa hai link liên tiếp, ngoài nhịp requestDelayMs của FuoClient
export const FUO_SOURCE_BUSY_WAIT_MS = 5000; // có job lấy đề của người dùng đang chờ/chạy: đợi chừng này rồi kiểm tra lại
export const FUO_SOURCE_COMMENT_REFRESH_DAYS = 7; // đề có sẵn không thêm câu: chỉ lấy lại bình luận khi lần lấy trước cũ hơn chừng này
export const FUO_SOURCE_MAX_LINES = 1000; // số dòng tối đa mỗi lần dán
export const FUO_SOURCE_MAX_CHARS = 90_000; // độ dài tối đa của khối văn bản dán vào (dưới giới hạn 100kb của express.json)
export const FUO_SOURCE_URL_MAX = 500; // độ dài tối đa một link (cùng giới hạn với ô lấy đề)
export const FUO_SOURCE_INSERT_CHUNK = 500; // số dòng mỗi lần ghi khi dán danh sách dài
export const FUO_SOURCE_ERROR_MAX = 1000; // cắt thông báo lỗi lưu vào DB
export const FUO_SOURCE_INVALID_LINE = "Không phải link bài viết FuOverflow (cần dạng https://fuoverflow.com/threads/ten-de.1234/)";
// "Lấy hết đề còn thiếu": chỉ bài đăng từ ngày này (giờ Việt Nam; bài chưa rõ ngày vẫn lấy), mỗi request nghỉ ít nhất chừng này, 1 luồng
export const FUO_SOURCE_FETCH_MISSING_SINCE = new Date("2024-01-01T00:00:00+07:00");
export const FUO_SOURCE_FETCH_MISSING_DELAY_MS = 0;
export const FUO_SOURCE_FETCH_MISSING_IMAGE_CONCURRENCY = 5; // số ảnh tải song song trong một đề khi lấy đề thiếu (mỗi luồng vẫn nghỉ DELAY_MS giữa hai request)
export const FUO_SOURCE_PICK_MAX = 500; // số đề tối đa admin tick trong popup "Lấy tất cả đề chưa có" mỗi lần bấm
export const FUO_SOURCE_WAIT_STAGE = "Đang chờ cập nhật đề"; // job của người dùng chờ lượt nạp của admin đang giữ cùng thread

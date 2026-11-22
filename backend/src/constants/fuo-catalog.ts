// Lượt quét danh mục FuOverflow của admin: mọi môn trong mục "TÀI LIỆU CÁC MÔN HỌC" và mọi bài trong diễn đàn của từng môn (chỉ thông tin mô tả, không tải ảnh/tệp)
// Không nghỉ cố định giữa các trang: tốc độ do bộ giới hạn chung FUO_ANON_* bên dưới tự điều chỉnh
export const FUO_CATALOG_SUBJECT_CONCURRENCY = 6; // số môn quét cùng lúc (request thật vẫn đi qua bộ giới hạn chung)
export const FUO_CATALOG_INCREMENTAL_BATCH = 4; // quét tăng dần: số trang tải cùng lúc trước khi xét có dừng không (quét đầy đủ thì tải mọi trang còn lại cùng lúc)
export const FUO_CATALOG_LOGIN_STREAK_MAX = 20; // chừng này môn liền nhau báo cần đăng nhập: dừng lượt, không gửi request vô ích
export const FUO_CATALOG_COOLDOWNS_MAX = 3; // số lần phải nghỉ dài trong một lượt (bị chặn kéo dài) thì dừng lượt
export const FUO_CATALOG_NEW_SUBJECTS_SHOWN = 100; // số môn có đề mới trả về trong trạng thái lượt quét

// Client FuOverflow ẩn danh của lượt quét (không cookie, không tài khoản) và bộ giới hạn AIMD dùng chung trong tiến trình
export const FUO_ANON_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"; // UA trình duyệt phổ thông, không gắn tài khoản nào
export const FUO_ANON_TIMEOUT_MS = 30_000; // mỗi request
export const FUO_ANON_MAX_ATTEMPTS = 4; // lỗi mạng/bị hạn chế thì thử lại tối đa chừng này lần (không thử lại 404 hay trang cần đăng nhập)
export const FUO_ANON_RETRY_BACKOFF_MS = [500, 1500, 4000]; // chờ trước lần thử lại thứ 2, 3, 4 (cộng thêm ngẫu nhiên)
export const FUO_ANON_LIMIT_INITIAL = 12; // số request cùng lúc lúc bắt đầu
export const FUO_ANON_LIMIT_MAX = 24; // trần cứng, không bao giờ vượt
export const FUO_ANON_LIMIT_MIN = 2; // sàn khi giảm một nửa
export const FUO_ANON_INCREASE_AFTER = 10; // số request thành công liên tiếp để nới thêm 1
export const FUO_ANON_RETRY_AFTER_MAX_MS = 60_000; // Retry-After dài hơn thì chỉ nghỉ chừng này (mọi request ẩn danh cùng nghỉ)
export const FUO_ANON_JITTER_MS = 250; // ngẫu nhiên thêm khi hết lượt nghỉ và trước lần thử lại
export const FUO_ANON_FLOOR_ROUNDS_MAX = 5; // ở mức sàn mà vẫn bị chặn chừng này đợt liền: nghỉ dài
export const FUO_ANON_COOLDOWN_MS = 5 * 60_000; // thời gian nghỉ dài đó
export const FUO_CATALOG_BUSY_WAIT_MS = 5000; // có job lấy đề của người dùng hoặc lượt nạp dữ liệu đang chạy: đợi chừng này rồi kiểm tra lại
export const FUO_CATALOG_MAX_PAGES = 200; // chặn phân trang bất thường của một môn (20 bài mỗi trang)
export const FUO_CATALOG_WRITE_CHUNK = 500; // số bài mỗi lần đọc/ghi DB
export const FUO_CATALOG_ERROR_MAX = 1000; // cắt thông báo lỗi lưu vào DB
export const FUO_CATALOG_FAILURES_SHOWN = 50; // số môn lỗi trả về trong trạng thái lượt quét
export const FUO_THREAD_TITLE_MAX = 255; // cùng độ dài cột fuo_threads.title
export const FUO_THREAD_LABEL_MAX = 60; // cùng độ dài cột fuo_threads.label
export const EXAM_DESCRIPTION_MAX = 5000; // nội dung bài đầu của thread lưu vào exams.description (chữ thuần)

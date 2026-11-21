// Lượt quét danh mục FuOverflow của admin: mọi môn trong mục "TÀI LIỆU CÁC MÔN HỌC" và mọi bài trong diễn đàn của từng môn (chỉ thông tin mô tả, không tải ảnh/tệp)
export const FUO_CATALOG_PAGE_PAUSE_MS = 3000; // nghỉ tối thiểu giữa hai trang (và hai môn) liên tiếp (lấy giá trị lớn hơn giữa số này và requestDelayMs)
export const FUO_CATALOG_BUSY_WAIT_MS = 5000; // có job lấy đề của người dùng hoặc lượt nạp dữ liệu đang chạy: đợi chừng này rồi kiểm tra lại
export const FUO_CATALOG_MAX_PAGES = 200; // chặn phân trang bất thường của một môn (20 bài mỗi trang)
export const FUO_CATALOG_WRITE_CHUNK = 500; // số bài mỗi lần đọc/ghi DB
export const FUO_CATALOG_ERROR_MAX = 1000; // cắt thông báo lỗi lưu vào DB
export const FUO_CATALOG_FAILURES_SHOWN = 50; // số môn lỗi trả về trong trạng thái lượt quét
export const FUO_THREAD_TITLE_MAX = 255; // cùng độ dài cột fuo_threads.title
export const FUO_THREAD_LABEL_MAX = 60; // cùng độ dài cột fuo_threads.label
export const EXAM_DESCRIPTION_MAX = 5000; // nội dung bài đầu của thread lưu vào exams.description (chữ thuần)

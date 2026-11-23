import { CONTRIBUTION_MAX_FILE_BYTES, CONTRIBUTION_MAX_FILE_MB, CONTRIBUTION_MAX_IMAGES, CONTRIBUTION_MAX_REQUEST_BYTES } from "./exam-contribution";

// Admin tải đề lên bằng tay: một thư mục images/Q1.webp... + ans.json. Cùng mức giới hạn với đóng góp đề (nginx đã chừa 310 MB).
export const EXAM_UPLOAD_MAX_IMAGES = CONTRIBUTION_MAX_IMAGES;
export const EXAM_UPLOAD_MAX_FILE_MB = CONTRIBUTION_MAX_FILE_MB;
export const EXAM_UPLOAD_MAX_FILE_BYTES = CONTRIBUTION_MAX_FILE_BYTES;
export const EXAM_UPLOAD_MAX_REQUEST_BYTES = CONTRIBUTION_MAX_REQUEST_BYTES;
export const EXAM_UPLOAD_ANSWERS_MAX_CHARS = 64 * 1024; // nội dung ans.json (100 câu viết đẹp chỉ vài KB)

// Ảnh WebP hợp lệ được giữ nguyên byte; chỉ mã hoá lại khi vượt một trong hai mức này
export const EXAM_UPLOAD_KEEP_MAX_SIDE = 2400;
export const EXAM_UPLOAD_KEEP_MAX_BYTES = 3 * 1024 * 1024;
export const EXAM_UPLOAD_WEBP_QUALITY = 80;
export const EXAM_UPLOAD_INPUT_MAX_PIXELS = 50_000_000; // chặn ảnh "bom giải nén"

// Đề tải tay: threadId = "m" + 12 ký tự hex (vừa VarChar(20), không trùng threadId dạng số của các đề cũ)
export const MANUAL_THREAD_PREFIX = "m";
export const MANUAL_THREAD_HEX_BYTES = 6;

export const EXAM_UPLOAD_NAMES_SHOWN = 10; // số tên tệp lỗi liệt kê trong lời nhắn
export const EXAM_GAP_QUERY_MAX = 60;
export const EXAM_UPLOAD_TX_TIMEOUT_MS = 60_000; // một transaction ghi tối đa 100 câu

// Tải đề chạy nền (?async=1): trả lời 202 ngay, xử lý lần lượt từng lượt
export const EXAM_UPLOAD_MAX_QUEUED = 3; // số lượt chờ tối đa (không tính lượt đang chạy)
export const EXAM_UPLOAD_MAX_STAGED_BYTES = 1024 * 1024 * 1024; // tổng tệp tạm trên đĩa
export const EXAM_UPLOAD_JOBS_KEPT = 50; // số lượt gần nhất giữ trong RAM để xem kết quả

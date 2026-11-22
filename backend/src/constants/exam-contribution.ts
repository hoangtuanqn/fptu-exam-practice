// Đóng góp đề thi: thành viên tải ảnh đề của một môn (không kèm đáp án), admin duyệt. Miễn phí, không thưởng credit.
export const CONTRIBUTION_STORAGE_DIR = "contributions"; // storage/contributions/<id>/001.webp; không công khai, chỉ admin xem qua API
export const CONTRIBUTION_MAX_IMAGES = 100;
export const CONTRIBUTION_MAX_FILE_MB = 10;
export const CONTRIBUTION_MAX_FILE_BYTES = CONTRIBUTION_MAX_FILE_MB * 1024 * 1024;
// Ảnh nằm trong RAM (multer memory storage) nên chặn tổng dung lượng một yêu cầu theo Content-Length trước khi đọc thân
export const CONTRIBUTION_MAX_REQUEST_BYTES = 300 * 1024 * 1024;
export const CONTRIBUTION_MAX_PENDING_PER_USER = 5;
export const CONTRIBUTION_UPLOADS_PER_HOUR = 10; // mỗi tài khoản, chỉ đếm lần gửi thành công

// Chuyển ảnh sang WebP
export const CONTRIBUTION_IMAGE_MAX_SIDE = 2400; // cạnh dài nhất sau khi thu nhỏ
export const CONTRIBUTION_WEBP_QUALITY = 80;
export const CONTRIBUTION_INPUT_MAX_PIXELS = 50_000_000; // chặn ảnh "bom giải nén"

export const CONTRIBUTION_TITLE_MAX = 200;
export const CONTRIBUTION_TERM_MAX = 50;
export const CONTRIBUTION_NOTE_MAX = 500;
export const CONTRIBUTION_REVIEW_NOTE_MAX = 300;

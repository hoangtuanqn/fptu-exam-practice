// Bình luận theo câu hỏi của đề: lọc tự động rồi hiện ngay, nghi ngờ thì chờ admin duyệt (decision 0019)

// Độ dài tối đa của một bình luận (sau khi bỏ khoảng trắng đầu/cuối) và số dòng tối đa
export const EXAM_COMMENT_MAX_LENGTH = 1000;
export const EXAM_COMMENT_MAX_LINES = 50;

// Chống spam theo tài khoản: số bình luận mỗi phút (bộ đếm trong bộ nhớ) và mỗi 24 giờ (đếm trong DB)
export const EXAM_COMMENT_PER_MINUTE = 20;
export const EXAM_COMMENT_PER_DAY = 500;
// Tài khoản tạo chưa quá EXAM_COMMENT_NEW_ACCOUNT_MS chỉ được chừng này mỗi 24 giờ
export const EXAM_COMMENT_NEW_ACCOUNT_PER_DAY = 100;
export const EXAM_COMMENT_NEW_ACCOUNT_MS = 24 * 60 * 60_000;
// Một người trên một câu trong 24 giờ
export const EXAM_COMMENT_PER_QUESTION_PER_DAY = 20;

// Cùng một người gửi lại đúng nội dung cũ trên cùng câu trong khoảng này thì bị từ chối (cũng là cửa sổ của các giới hạn theo ngày)
export const EXAM_COMMENT_DUPLICATE_WINDOW_MS = 24 * 60 * 60_000;

// Một ký tự lặp liền nhau quá chừng này lần -> chờ duyệt
export const EXAM_COMMENT_REPEAT_CHAR_MAX = 15;
// Cùng một nội dung dài từ SPAM_MIN_LENGTH ký tự ở từ SPAM_QUESTIONS câu khác nhau trong 24 giờ -> chờ duyệt
export const EXAM_COMMENT_SPAM_MIN_LENGTH = 30;
export const EXAM_COMMENT_SPAM_QUESTIONS = 3;
// Bị admin từ chối từ STRIKES bình luận trong STRIKE_WINDOW_MS -> mọi bình luận mới đều chờ duyệt
export const EXAM_COMMENT_STRIKES = 3;
export const EXAM_COMMENT_STRIKE_WINDOW_MS = 7 * 24 * 60 * 60_000;

// Báo cáo: số người khác nhau báo cáo thì bình luận tự về chờ duyệt; số báo cáo mỗi người trong 24 giờ
export const EXAM_COMMENT_AUTO_HIDE_REPORTS = 3;
export const EXAM_COMMENT_REPORTS_PER_DAY = 10;
export const EXAM_COMMENT_REPORT_REASON_MAX = 255;

// Bình chọn đáp án và thích (ảnh câu hỏi, bình luận): số thao tác mỗi phút mỗi tài khoản (bộ đếm trong bộ nhớ)
export const EXAM_VOTE_PER_MINUTE = 60;
export const EXAM_LIKE_PER_MINUTE = 60;
// Chữ đáp án được bình chọn
export const EXAM_VOTE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

// Bình luận chờ duyệt của chính người xem hiện ở đầu trang 1, tối đa chừng này dòng
export const EXAM_COMMENT_OWN_PENDING_MAX = 20;

// Admin chỉ nhận một thông báo bình luận (chờ duyệt / bị báo cáo) cho mỗi đề trong khoảng này (số thật xem ở badge)
export const EXAM_COMMENT_NOTICE_THROTTLE_MS = 60 * 60_000;

// Người viết nhận tối đa một thông báo thích (hoặc không thích) cho mỗi bình luận trong khoảng này; bộ nhớ chống báo trùng giữ tối đa chừng này khoá
export const EXAM_COMMENT_REACTION_NOTICE_THROTTLE_MS = 60 * 60_000;
export const EXAM_COMMENT_REACTION_NOTICE_KEYS_MAX = 5000;
// Đoạn trích nội dung bình luận trong thông báo
export const EXAM_COMMENT_NOTICE_EXCERPT = 150;

// Duyệt hàng loạt tối đa chừng này bình luận một lần
export const EXAM_COMMENT_BULK_MAX = 100;

// Tệp đính kèm của bình luận (decision 0020): storage/comments/<examId>/<tên ngẫu nhiên>, không công khai, chỉ phát qua link ký
export const COMMENT_FILES_STORAGE_DIR = "comments";
export const EXAM_COMMENT_FILES_MAX = 4; // mỗi bình luận
export const EXAM_COMMENT_IMAGE_MAX_MB = 5;
export const EXAM_COMMENT_IMAGE_MAX_BYTES = EXAM_COMMENT_IMAGE_MAX_MB * 1024 * 1024;
export const EXAM_COMMENT_FILE_MAX_MB = 10; // pdf, zip, txt
export const EXAM_COMMENT_FILE_MAX_BYTES = EXAM_COMMENT_FILE_MAX_MB * 1024 * 1024;
// Tệp nằm trong RAM (multer memory storage): chặn tổng dung lượng theo Content-Length trước khi đọc thân (thêm 1 MB cho các trường chữ)
export const EXAM_COMMENT_MAX_REQUEST_BYTES = EXAM_COMMENT_FILES_MAX * EXAM_COMMENT_FILE_MAX_BYTES + 1024 * 1024;
// Số tệp mỗi tài khoản tải lên trong 24 giờ (giữ dung lượng đĩa); lời nhắn không nói con số
export const EXAM_COMMENT_UPLOADS_PER_DAY = 20;
// Ảnh được giải mã lại thành WebP (bỏ EXIF/GPS), thu nhỏ cạnh dài
export const EXAM_COMMENT_IMAGE_MAX_SIDE = 2400;
export const EXAM_COMMENT_IMAGE_INPUT_MAX_PIXELS = 50_000_000; // chặn ảnh "bom giải nén"
export const EXAM_COMMENT_WEBP_QUALITY = 80;
export const EXAM_COMMENT_FILE_NAME_MAX = 120; // tên hiển thị (ký tự)
// Link ký của tệp: còn hạn ít nhất chừng này, làm tròn lên theo giờ để URL không đổi giữa các lần tải trang (ảnh dùng được cache)
export const EXAM_COMMENT_FILE_URL_TTL_MS = 2 * 60 * 60_000;
export const EXAM_COMMENT_FILE_VIEWS_PER_MINUTE = 600; // theo IP

// Nhắc tên (@tên): tối đa chừng này người mỗi bình luận; gợi ý tên trả tối đa MENTION_SEARCH_MAX người
export const EXAM_COMMENT_MENTIONS_MAX = 5;
export const EXAM_COMMENT_MENTION_SEARCH_DEFAULT = 8;
export const EXAM_COMMENT_MENTION_SEARCH_MAX = 20;
export const EXAM_COMMENT_MENTION_QUERY_MAX = 50;
export const EXAM_MENTION_SEARCH_PER_MINUTE = 60;

// Vì sao một bình luận bị giữ chờ duyệt (cột flag_reason); UPLOAD = có tệp đính kèm
export const EXAM_COMMENT_FLAG_REASONS = ["WORDS", "LINK", "CONTACT", "REPEATED", "SPAM", "STRIKES", "REPORTED", "UPLOAD"] as const;
export type CommentFlagReason = (typeof EXAM_COMMENT_FLAG_REASONS)[number];

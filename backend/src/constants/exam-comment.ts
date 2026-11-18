// Bình luận theo câu hỏi của đề (admin duyệt trước khi người khác thấy)

// Độ dài tối đa của một bình luận (sau khi bỏ khoảng trắng đầu/cuối)
export const EXAM_COMMENT_MAX_LENGTH = 1000;

// Chống spam theo tài khoản: số bình luận mỗi phút (bộ đếm trong bộ nhớ) và mỗi 24 giờ (đếm trong DB)
export const EXAM_COMMENT_PER_MINUTE = 5;
export const EXAM_COMMENT_PER_DAY = 30;

// Cùng một người gửi lại đúng nội dung cũ trên cùng câu trong khoảng này thì bị từ chối
export const EXAM_COMMENT_DUPLICATE_WINDOW_MS = 24 * 60 * 60_000;

// Bình luận chờ duyệt của chính người xem hiện ở đầu trang 1, tối đa chừng này dòng
export const EXAM_COMMENT_OWN_PENDING_MAX = 20;

// Admin chỉ nhận một thông báo "có bình luận mới" cho mỗi đề trong khoảng này (số chờ duyệt thật xem ở badge)
export const EXAM_COMMENT_NOTICE_THROTTLE_MS = 60 * 60_000;

// Duyệt hàng loạt tối đa chừng này bình luận một lần
export const EXAM_COMMENT_BULK_MAX = 100;

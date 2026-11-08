// Khoảng cách giữa các lần ôn theo "hộp" (kiểu Leitner): sai -> hộp 1; đúng -> lên hộp kế; đúng ở hộp cuối -> tốt nghiệp
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;
export const REVIEW_MAX_BOX = REVIEW_INTERVAL_DAYS.length;

// Thành viên thường giữ tối đa chừng này câu trong sổ (Pro không giới hạn)
export const REVIEW_FREE_LIMIT = 50;

// Số câu ôn trong một lượt (một lần bấm "Ôn ngay")
export const REVIEW_SESSION_SIZE = 20;

// Một ngày được tính là "có học" khi nộp ít nhất một bài (làm trên nửa số câu) hoặc ôn xong từng này câu trong sổ
export const STUDY_MIN_REVIEWS = 3;

// Mục tiêu tuần cho phép chọn (số ngày học mỗi tuần)
export const STUDY_GOAL_CHOICES = [3, 5, 7] as const;

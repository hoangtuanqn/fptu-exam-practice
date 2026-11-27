// Thưởng cho mỗi báo cáo đáp án được admin xác nhận là đúng (credit). Giao diện có hằng số khớp: frontend/src/features/answer-report/config.ts
export const ANSWER_REPORT_REWARD = 200;

// Thưởng khi admin xác nhận một đánh giá 👎 lời giải AI là đúng (chỉ lời giải sai; sửa cả đáp án thì thưởng ANSWER_REPORT_REWARD)
export const EXPLAIN_FEEDBACK_REWARD = 50;

// Mỗi người gửi tối đa chừng này báo cáo mỗi ngày (chống spam)
export const ANSWER_REPORT_DAILY_LIMIT = 20;

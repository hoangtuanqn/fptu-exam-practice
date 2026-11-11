// Lịch ôn FSRS (thư viện ts-fsrs), chạy song song và tách biệt với Sổ câu sai kiểu Leitner (constants/review.ts)

// Tham số của bộ lập lịch; phần còn lại lấy mặc định của thư viện. Tắt fuzz để cùng dữ liệu luôn ra cùng lịch.
export const FSRS_PARAMS = {
  request_retention: 0.9,
  maximum_interval: 365,
  enable_fuzz: false,
} as const;

// Suy ra mức nhớ từ kết quả làm câu: sai -> Again; đúng nhưng lâu hơn SLOW giây -> Hard; đúng trong FAST giây -> Easy; còn lại -> Good
export const FSRS_RATING_SECONDS = { fast: 15, slow: 90 } as const;
export type RatingThresholds = { fast: number; slow: number };

export const FSRS_MAX_SECONDS = 24 * 60 * 60; // chặn số giây vô lý từ client
export const FSRS_DUE_DEFAULT_LIMIT = 20;
export const FSRS_DUE_MAX_LIMIT = 100;
export const FSRS_TX_RETRIES = 3; // chạy lại giao dịch ôn khi gặp deadlock/trùng khoá do gửi song song

// Flashcard theo môn: bộ ảnh câu hỏi riêng (nhập thủ công, không lấy từ đề thi), mỗi thẻ có nút hiện đáp án
export const FLASHCARD_STORAGE_DIR = "flashcards"; // storage/flashcards/<MÃ MÔN>/Q<số>.webp; không công khai, chỉ phát qua link ký
export const FLASHCARD_PREVIEW_LIMIT = 10; // tài khoản thường chỉ thấy chừng này thẻ đầu của môn
export const FLASHCARD_URL_TTL_MS = 60 * 60 * 1000; // link ảnh ký sống 1 giờ
export const FLASHCARD_MAX_CARDS = 5000; // chặn nhập nhầm cả thư mục lạ

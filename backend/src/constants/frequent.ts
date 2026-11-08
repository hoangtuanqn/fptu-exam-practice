// "Câu hay ra": những câu lặp lại ở nhiều đề của cùng một môn
export const FREQUENT_FREE_LIMIT = 5; // gói thường xem chừng này câu đầu
export const FREQUENT_MAX_ITEMS = 100;
export const FREQUENT_MATCH_BITS = 6; // hai dấu vân tay khác nhau tối đa chừng này bit (trên 1536) thì coi là cùng một câu. Đặt thấp để ưu tiên chính xác: câu khác nội dung nhưng cùng bố cục cách nhau từ ~15 bit
export const FREQUENT_MAX_NEW_HASHES = 400; // mỗi lượt tính tối đa chừng này ảnh mới
export const FREQUENT_CACHE_MS = 30 * 60 * 1000;

// Cấu hình Thư viện đề thi (admin chỉnh, lưu trong bảng settings với tiền tố "library.")
export interface LibraryConfig {
  enabled: boolean; // công tắc tổng: tắt thì trang thư viện và các lối vào biến mất, đề miễn phí theo quy tắc ngừng áp dụng
  freeRuleEnabled: boolean; // bật quy tắc tự động: đề của các kỳ thi cũ được miễn phí
  newestTermsPaid: number; // số kỳ thi mới nhất (SU26, FA25...) vẫn tính phí; các kỳ cũ hơn được miễn phí
}

export const LIBRARY_DEFAULTS: LibraryConfig = {
  enabled: true,
  freeRuleEnabled: true,
  newestTermsPaid: 2,
};

export const LIBRARY_KEY_PREFIX = "library.";

// Link thread FuOverflow từ mã bài (cùng dạng với backend: utils/fuo-url.ts)
export const FUO_HOST = "fuoverflow.com";

// Link thread từ mã bài: dùng khi chọn đề trong danh sách (Kho đề) thay vì tự ghép chuỗi ở từng nơi
export const fuoThreadUrl = (threadId: string) => `https://${FUO_HOST}/threads/${threadId}/`;

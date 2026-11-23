// Đưa chữ về dạng không dấu, viết thường, để tìm "toan" vẫn khớp "Toán" (môn, tên đề)
export const foldText = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase();

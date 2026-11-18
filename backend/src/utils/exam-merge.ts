import { uniqueName } from "./filename";

// Link gốc (ảnh câu hỏi, tệp đính kèm) như lưu trong DB: bỏ token tạm sau dấu "?"
export const withoutQuery = (url: string) => url.split("?")[0]!;

/**
 * Nạp dữ liệu mới cho đề có sẵn: so ảnh và tên từng câu đã lưu với ảnh cùng vị trí trên thread hiện tại.
 * - Lệch ảnh hoặc tên ở bất kỳ câu nào (thread chèn/xoá/đổi ảnh ở giữa, tên được đánh lại): orderChanged, không thêm gì
 *   để không đánh số lại câu cũ và không đè ảnh/bình luận của câu cũ.
 * - Khớp: thêm các vị trí chưa có câu (thường là ảnh mới ở cuối). Thread ít ảnh hơn thì không xoá câu nào.
 * Trả về chỉ số (từ 0) trong danh sách ảnh của thread cần tải thêm.
 */
export function planQuestionMerge(stored: { number: number; name: string; sourceImage: string }[], threadImages: { url: string; name: string }[]) {
  for (const q of stored) {
    const image = threadImages[q.number - 1];
    if (image && (withoutQuery(image.url) !== q.sourceImage || image.name !== q.name)) return { orderChanged: true, add: [] as number[] };
  }
  const have = new Set(stored.map((q) => q.number));
  return { orderChanged: false, add: threadImages.flatMap((_, i) => (have.has(i + 1) ? [] : [i])) };
}

/**
 * Tên cho các câu thêm vào: bắt đầu từ tên trên thread, đổi thành "<tên>-2"... nếu trùng tên câu đã lưu hoặc tệp đã có
 * trong thư mục ảnh (so không phân biệt hoa thường, không đuôi). Tên câu cũng là tên tệp nên không bao giờ ghi đè ảnh cũ.
 */
export function pickNewNames(wanted: string[], storedNames: string[], existingFiles: string[]) {
  const used = new Set([...storedNames, ...existingFiles.map((f) => f.replace(/\.[^.]*$/, ""))].map((n) => n.toLowerCase()));
  return wanted.map((name) => uniqueName(name, used));
}

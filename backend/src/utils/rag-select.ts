export interface PickableHit {
  slug: string;
  subject: string;
  p: number;
  content: string;
}

/**
 * Câu hỏi nêu nhiều mã môn: mỗi mã (nhóm các môn của mã đó, ví dụ PRO192 gồm PRO192 và PRO192C) có phần riêng trong ngữ cảnh,
 * để chương của môn này không chiếm chỗ của đoạn "cách đánh giá" của môn kia. `list` đã xếp xác suất giảm dần.
 * Mỗi nhóm luôn có `minPer` đoạn tốt nhất, thêm đến `maxPer` nếu p đạt `include`; quá ngân sách ký tự thì chỉ giữ đoạn đầu của nhóm.
 * Kết quả theo thứ tự nhóm (thứ tự người dùng gõ mã).
 */
export function pickMultiHits<T extends PickableHit>(list: T[], groups: string[][], o: { include: number; minPer: number; maxPer: number; maxChars: number }): T[] {
  const out: T[] = [];
  let chars = 0;
  for (const group of groups) {
    let taken = 0;
    for (const h of list) {
      if (!group.includes(h.subject)) continue;
      if (taken >= o.maxPer || (taken >= o.minPer && h.p < o.include)) break;
      if (taken > 0 && chars + h.content.length > o.maxChars) break;
      out.push(h);
      chars += h.content.length;
      taken++;
    }
  }
  return out;
}

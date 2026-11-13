export interface PickableHit {
  slug: string;
  subject: string;
  p: number;
  content: string;
}

/**
 * Câu hỏi nêu nhiều mã môn: mỗi mã (nhóm các môn của mã đó, ví dụ PRO192 gồm PRO192 và PRO192C) có phần riêng trong ngữ cảnh,
 * để chương của môn này không chiếm chỗ của đoạn "cách đánh giá" của môn kia. `list` đã xếp xác suất giảm dần.
 * Hai lượt: (1) mọi nhóm đều nhận `minPer` đoạn tốt nhất, không tính ngân sách; (2) rồi mới thêm đến `maxPer` đoạn cho từng nhóm
 * khi p đạt `include` và còn ngân sách ký tự, nên phần thêm của nhóm đứng trước không lấy mất phần bảo đảm của nhóm đứng sau.
 * Kết quả theo thứ tự nhóm (thứ tự người dùng gõ mã).
 */
export function pickMultiHits<T extends PickableHit>(list: T[], groups: string[][], o: { include: number; minPer: number; maxPer: number; maxChars: number }): T[] {
  const picked = groups.map((group) => list.filter((h) => group.includes(h.subject)));
  const taken = picked.map((hits) => hits.slice(0, o.minPer));
  let chars = taken.flat().reduce((n, h) => n + h.content.length, 0);
  picked.forEach((hits, g) => {
    for (const h of hits.slice(o.minPer, o.maxPer)) {
      if (h.p < o.include || chars + h.content.length > o.maxChars) break;
      taken[g]!.push(h);
      chars += h.content.length;
    }
  });
  return taken.flat();
}

export interface PickableHit {
  slug: string;
  subject: string;
  p: number;
  content: string;
  kindMatch?: boolean; // đoạn thuộc phần syllabus mà câu hỏi nhắc tới
  kind?: string; // loại đoạn (overview, assessment, chapters...)
}

/** Đoạn đúng loại được hỏi lên trước, rồi tới xác suất cao: đoạn "câu hỏi gợi ý" điểm cao không được chiếm chỗ của đoạn đánh giá/chương */
export const byKindThenP = (a: Pick<PickableHit, "p" | "kindMatch">, b: Pick<PickableHit, "p" | "kindMatch">) => Number(!!b.kindMatch) - Number(!!a.kindMatch) || b.p - a.p;

/**
 * Thứ tự ưu tiên trong một nhóm mã môn: đoạn đúng loại được hỏi trước, rồi xác suất cao; mỗi LOẠI đoạn xuất hiện một lần trước khi loại nào lặp lại
 * (PRO192 và PRO192C đều có "tổng quan" và "đánh giá": bản thứ hai không được chiếm chỗ của phần "chương").
 */
export function orderGroup<T extends Pick<PickableHit, "p" | "kindMatch" | "kind">>(hits: T[]): T[] {
  const sorted = [...hits].sort(byKindThenP);
  const seen = new Set<string | undefined>();
  const first: T[] = [];
  const rest: T[] = [];
  for (const h of sorted) (seen.has(h.kind) ? rest : first).push(h), seen.add(h.kind);
  return [...first, ...rest];
}

/**
 * Câu hỏi nêu nhiều mã môn: mỗi mã (nhóm các môn của mã đó, ví dụ PRO192 gồm PRO192 và PRO192C) có phần riêng trong ngữ cảnh,
 * để chương của môn này không chiếm chỗ của đoạn "cách đánh giá" của môn kia. `list` đã xếp xác suất giảm dần.
 * Hai lượt: (1) mọi nhóm đều nhận `minPer` đoạn tốt nhất (đoạn đúng loại được hỏi trước), không tính ngân sách; (2) rồi mới thêm đến `maxPer` đoạn cho từng nhóm
 * khi p đạt `include` và còn ngân sách ký tự, nên phần thêm của nhóm đứng trước không lấy mất phần bảo đảm của nhóm đứng sau.
 * Kết quả theo thứ tự nhóm (thứ tự người dùng gõ mã).
 */
export function pickMultiHits<T extends PickableHit>(list: T[], groups: string[][], o: { include: number; minPer: number; maxPer: number; maxChars: number }): T[] {
  const picked = groups.map((group) => orderGroup(list.filter((h) => group.includes(h.subject))));
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

/**
 * Câu hỏi không nêu phần nào của syllabus (ví dụ "cho mình syllabus của X, Y, Z") thì ưu tiên các phần chính (tổng quan, đánh giá, chương);
 * nếu không, từ "syllabus" khớp với các đoạn "câu hỏi gợi ý của syllabus" và chúng chiếm hết chỗ.
 */
export function effectiveKinds<K extends string>(asked: ReadonlySet<K>, defaults: readonly K[]): ReadonlySet<K> {
  return asked.size > 0 ? asked : new Set(defaults);
}

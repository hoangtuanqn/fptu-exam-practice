// Logic thuần của việc chạy ban đêm (services/similarity-job.service): môn nào cần làm, chia số ảnh được tính giữa các môn.
// Không đụng DB để test được bằng dữ liệu giả.

export interface ExamAggregate {
  count: number; // số đề dùng được của môn
  idSum: number; // tổng id các đề đó (đổi khi có đề thêm/xoá, hoặc đề DEFAULT vừa được AI giải)
  maxCreatedAt: Date | null;
  maxRefreshedAt: Date | null; // đề được làm mới (lấy lại ảnh, giải lại)
}

export const EMPTY_EXAM_AGGREGATE: ExamAggregate = { count: 0, idSum: 0, maxCreatedAt: null, maxRefreshedAt: null };

/** Chữ ký của tập đề dùng được của một môn: khác chữ ký của lần chạy trước nghĩa là đề đã đổi. */
export const examSignature = (a: ExamAggregate) => `${a.count}:${a.idSum}:${a.maxCreatedAt?.getTime() ?? 0}:${a.maxRefreshedAt?.getTime() ?? 0}`;

export interface LastRun {
  signature: string;
  hashCursor: number; // id câu cuối cùng đã thử tính dấu vân tay
}

export interface SubjectSnapshot {
  signature: string;
  hasUsableExams: boolean;
  lastRun: LastRun | null;
}

/** Đề của môn đã đổi kể từ lần chạy thành công gần nhất (chưa chạy lần nào thì chỉ tính khi môn có đề dùng được). */
export const examsChanged = (s: SubjectSnapshot) => (s.lastRun ? s.lastRun.signature !== s.signature : s.hasUsableExams);

/** Tính dấu vân tay tiếp từ câu nào: đề đổi (hoặc chạy lại toàn bộ) thì thử lại từ đầu, kể cả các ảnh trước đó không đọc được. */
export const hashCursorFor = (s: SubjectSnapshot, force = false) => (force || examsChanged(s) || !s.lastRun ? 0 : s.lastRun.hashCursor);

export interface SubjectWork {
  missingHashes: number; // câu chưa có dấu vân tay, sau con trỏ
  unembedded: number; // câu đã có dấu vân tay nhưng chưa có vector (vd "Câu hay ra" vừa tính trong ngày)
}

/** Môn cần chạy đêm nay: đề đổi, còn ảnh chưa tính, hoặc còn câu chưa có vector. */
export const needsWork = (s: SubjectSnapshot, w: SubjectWork, force = false) =>
  (force && (s.hasUsableExams || s.lastRun !== null)) || examsChanged(s) || w.missingHashes > 0 || w.unembedded > 0;

/**
 * Chia `total` ảnh cho các môn: môn ít ảnh nhận đủ trước, phần còn lại chia đều cho môn nhiều ảnh hơn.
 * Tổng không vượt `total`; đủ chỗ thì môn nào cũng nhận đủ. Kết quả theo id môn (môn không cần thì 0).
 */
export function splitHashBudget(needs: readonly { id: number; missing: number }[], total: number): Map<number, number> {
  const out = new Map<number, number>(needs.map((n) => [n.id, 0]));
  let left = Math.max(0, Math.floor(total));
  const open = needs.filter((n) => n.missing > 0).sort((a, b) => a.missing - b.missing || a.id - b.id);
  for (let i = 0; i < open.length && left > 0; i++) {
    const n = open[i]!;
    const give = Math.min(n.missing, Math.floor(left / (open.length - i)));
    out.set(n.id, give);
    left -= give;
  }
  // Phần lẻ do làm tròn xuống: chia thêm từng ảnh cho môn còn thiếu
  for (const n of open) {
    if (left <= 0) break;
    const extra = Math.min(left, n.missing - out.get(n.id)!);
    out.set(n.id, out.get(n.id)! + extra);
    left -= extra;
  }
  return out;
}

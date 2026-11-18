import type { ExamKind } from "@prisma/client";

interface ThreadRow {
  threadId: string;
  subjectCode: string;
  title: string;
  label: string | null;
  kind: ExamKind;
  postedAt: Date | null;
  replies: number;
}

const same = (a: ThreadRow, b: ThreadRow) =>
  a.subjectCode === b.subjectCode && a.title === b.title && a.label === b.label && a.kind === b.kind && a.replies === b.replies && (a.postedAt?.getTime() ?? null) === (b.postedAt?.getTime() ?? null);

/** Chia các bài vừa đọc thành bài mới và bài đã đổi so với bản đã lưu; bài không đổi thì không ghi lại. */
export function diffCatalogRows<T extends ThreadRow>(stored: ThreadRow[], incoming: T[]): { added: T[]; changed: T[] } {
  const byId = new Map(stored.map((r) => [r.threadId, r]));
  const added: T[] = [];
  const changed: T[] = [];
  for (const row of incoming) {
    const old = byId.get(row.threadId);
    if (!old) added.push(row);
    else if (!same(old, row)) changed.push(row);
  }
  return { added, changed };
}

/** Quét tăng dần: danh sách bài xếp theo hoạt động mới nhất, nên trang không có bài mới hay đã đổi thì các trang sau cũng không có: dừng ở đây. */
export const pageHasNews = (stored: ThreadRow[], page: ThreadRow[]) => {
  const { added, changed } = diffCatalogRows(stored, page);
  return added.length + changed.length > 0;
};

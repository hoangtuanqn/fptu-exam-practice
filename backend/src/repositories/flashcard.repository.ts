import { prisma } from "../configs/prisma";

export const flashcardRepository = {
  /** Thẻ của môn theo số câu tăng dần. */
  cardsOfSubject: (subjectCode: string) =>
    prisma.flashcard.findMany({ where: { subject: { code: subjectCode } }, orderBy: { number: "asc" }, select: { number: true, answer: true } }),

  /** Các môn đã có thẻ, kèm số thẻ. */
  async subjectsWithCards() {
    const rows = await prisma.flashcard.groupBy({ by: ["subjectId"], _count: { _all: true } });
    if (rows.length === 0) return [];
    const subjects = await prisma.subject.findMany({ where: { id: { in: rows.map((r) => r.subjectId) } }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true } });
    const count = new Map(rows.map((r) => [r.subjectId, r._count._all]));
    return subjects.map((s) => ({ code: s.code, name: s.name, cardCount: count.get(s.id) ?? 0 }));
  },
};

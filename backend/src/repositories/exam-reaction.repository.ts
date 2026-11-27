import { prisma } from "../configs/prisma";

// Thích ảnh câu hỏi và bình chọn đáp án: mọi truy vấn theo khoá chính (exam_id, question_number, user_id) hoặc tiền tố của nó
type Question = { examId: string; questionNumber: number };

export const examReactionRepository = {
  countQuestionLikes: (q: Question) => prisma.examQuestionLike.count({ where: q }),

  hasQuestionLike: async (q: Question, userId: string) =>
    !!(await prisma.examQuestionLike.findUnique({ where: { examId_questionNumber_userId: { ...q, userId } }, select: { userId: true } })),

  async setQuestionLike(q: Question, userId: string, liked: boolean) {
    if (liked) await prisma.examQuestionLike.createMany({ data: [{ ...q, userId }], skipDuplicates: true });
    else await prisma.examQuestionLike.deleteMany({ where: { ...q, userId } });
  },

  // Số người theo từng tổ hợp đáp án ("A", "A C"...): một GROUP BY trên tiền tố khoá chính
  voteGroups: (q: Question) => prisma.examQuestionVote.groupBy({ by: ["answers"], where: q, _count: { _all: true } }),

  myVote: async (q: Question, userId: string) =>
    (await prisma.examQuestionVote.findUnique({ where: { examId_questionNumber_userId: { ...q, userId } }, select: { answers: true } }))?.answers ?? null,

  // answers rỗng = bỏ phiếu
  async setVote(q: Question, userId: string, answers: string) {
    if (!answers) await prisma.examQuestionVote.deleteMany({ where: { ...q, userId } });
    else await prisma.examQuestionVote.upsert({ where: { examId_questionNumber_userId: { ...q, userId } }, create: { ...q, userId, answers }, update: { answers } });
  },
};

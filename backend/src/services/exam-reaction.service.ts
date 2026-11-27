import { examCommentRepository } from "../repositories/exam-comment.repository";
import { examReactionRepository } from "../repositories/exam-reaction.repository";
import type { Actor } from "../utils/actor";
import { assertQuestion } from "./exam-comment.service";
import { examService } from "./exam.service";

// Thích ảnh câu hỏi và bình chọn đáp án: chỉ trả số, không bao giờ trả ai đã chọn gì (trừ lựa chọn của chính người xem)
type Question = { examId: string; questionNumber: number };

/** Gộp các nhóm "A C" -> số người theo từng chữ; voters = số người đã bình chọn. */
export function tallyVotes(groups: readonly { answers: string; count: number }[], mine: string | null) {
  const counts: Record<string, number> = {};
  let voters = 0;
  for (const g of groups) {
    voters += g.count;
    for (const letter of g.answers.split(" ").filter(Boolean)) counts[letter] = (counts[letter] ?? 0) + g.count;
  }
  return { voters, counts, mine: mine ? mine.split(" ").filter(Boolean) : [] };
}

// exam = cho phép 0 (cả đề): chỉ để đọc; thích và bình chọn trên 0 là 422 như mục không tồn tại
async function openQuestion(actor: Actor, examId: string, questionNumber: number, exam = false): Promise<Question> {
  await examService.assertAccess(actor, examId);
  await assertQuestion(examId, questionNumber, exam);
  return { examId, questionNumber };
}

// Tệp đính kèm (số âm) và cả đề (0) không có bình chọn
async function votesOf(q: Question, viewerId: string | null) {
  if (q.questionNumber <= 0) return tallyVotes([], null);
  const [groups, mine] = await Promise.all([examReactionRepository.voteGroups(q), viewerId ? examReactionRepository.myVote(q, viewerId) : null]);
  return tallyVotes(groups.map((g) => ({ answers: g.answers, count: g._count._all })), mine);
}

export const examReactionService = {
  async reactions(actor: Actor, viewerId: string | null, examId: string, questionNumber: number) {
    const q = await openQuestion(actor, examId, questionNumber, true);
    const [likes, liked, votes] = await Promise.all([
      examReactionRepository.countQuestionLikes(q),
      viewerId ? examReactionRepository.hasQuestionLike(q, viewerId) : false,
      votesOf(q, viewerId),
    ]);
    return { likes, liked, votes };
  },

  // answers đã bỏ trùng và sắp xếp ở validator; rỗng = bỏ phiếu
  async vote(actor: Actor, userId: string, examId: string, questionNumber: number, answers: string[]) {
    const q = await openQuestion(actor, examId, questionNumber > 0 ? questionNumber : 0); // 0 không tồn tại: cùng lỗi 422 (route đã chặn số âm)
    await examReactionRepository.setVote(q, userId, answers.join(" "));
    // Bấm chọn = bình luận "A, C" hiện ngay; đổi hoặc gỡ chọn thì thu hồi bình luận cũ do hệ thống tạo (bình luận người dùng tự viết giữ nguyên)
    await examCommentRepository.deleteAutoVote(examId, questionNumber, userId);
    if (answers.length) await examCommentRepository.create({ examId, questionNumber, userId, body: answers.join(", "), status: "APPROVED", flagReason: null, autoVote: true });
    return votesOf(q, userId);
  },

  async like(actor: Actor, userId: string, examId: string, questionNumber: number, liked: boolean) {
    const q = await openQuestion(actor, examId, questionNumber);
    await examReactionRepository.setQuestionLike(q, userId, liked);
    return { likes: await examReactionRepository.countQuestionLikes(q), liked };
  },
};

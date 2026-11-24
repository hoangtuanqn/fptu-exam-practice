import { examAttemptRepository } from "../repositories/exam-attempt.repository";
import { examAttachmentRepository } from "../repositories/exam-attachment.repository";
import { examRepository } from "../repositories/exam.repository";
import { EXAM_NOT_FOUND } from "../constants/exam";
import { userExamRepository } from "../repositories/user-exam.repository";
import type { Db } from "../repositories/wallet.repository";
import { topicLabelerService } from "./ai/topic-labeler.service";
import { catalogService } from "./catalog.service";
import { planService } from "./plan.service";
import { PRO_BENEFITS } from "../constants/plan";
import { examSolveService } from "./exam-solve.service";
import { AppError } from "../rules/error";
import { isMember, type Actor, type Owner } from "../utils/actor";
import { failedMessage, toAnswersPayload } from "../utils/exam-answers";
import { storageDir } from "../configs/env";
import { resolveInside } from "../utils/exam-zip";
import { fileUrlOf, toAttachmentDto } from "../utils/file-url";
import { toMeta, type PaginationQuery } from "../utils/pagination";

const imageUrlOf = fileUrlOf;

export const examService = {
  // Người dùng bấm "Thử lại" trên đề FAILED (có thời gian chờ giữa hai lần để không đốt token)
  // Đề được mở xem (trang xem trước): để Kho đề bỏ chấm "chưa xem"
  async markOpened(actor: Actor, id: string) {
    await userExamRepository.markOpened(actor.owner, id);
  },

  async retrySolve(actor: Actor, id: string) {
    await this.assertAccess(actor, id);
    const result = await examSolveService.retry(id);
    if (result === "cooldown") throw AppError.conflict("Vừa thử lại xong, vui lòng đợi ít phút rồi thử lại");
    return { result };
  },
  // Đề nhập xong (hoặc đã có sẵn) đều vào kho của người nhập: thành viên hoặc khách
  addToLibrary: (owner: Owner, examId: string, db?: Db) => userExamRepository.add(owner, examId, db),

  // Chỉ chủ kho (hoặc admin) được xem/làm đề; người khác nhận 404 như thể đề không tồn tại
  async assertAccess(actor: Actor, examId: string) {
    if (actor.isAdmin) return;
    if (!(await userExamRepository.has(actor.owner, examId))) throw AppError.notFound(EXAM_NOT_FOUND);
  },

  // Tệp ảnh của đề (theo thread) chỉ cho chủ kho hoặc admin; người khác nhận 404 như tệp không tồn tại
  async assertThreadFileAccess(actor: Actor, threadId: string) {
    const ok = actor.isAdmin ? !!(await examRepository.findByThreadId(threadId)) : await userExamRepository.hasThread(actor.owner, threadId);
    if (!ok) throw AppError.notFound(EXAM_NOT_FOUND);
  },

  async listMine(owner: Owner, query: PaginationQuery & { subject?: string }) {
    const { items, total } = await userExamRepository.list(owner, query);
    // Khách chưa có lịch sử làm bài nên không cần thống kê
    const stats = isMember(owner)
      ? await examAttemptRepository.statsByExam(
          owner.userId,
          items.map((i) => i.exam.id),
        )
      : [];
    const byExam = new Map(stats.map((s) => [s.examId, s]));

    return {
      items: items.map(({ exam: { _count, ...exam }, createdAt }) => ({
        ...exam,
        kind: exam.kind ?? "FE", // đề cũ chưa phân loại: coi là FE như catalog
        attachments: _count.attachments, // số tệp đính kèm (pdf, zip...)
        addedAt: createdAt,
        attempts: byExam.get(exam.id)?._count._all ?? 0,
        bestScore: byExam.get(exam.id)?._max.score ?? null,
      })),
      meta: toMeta(query, total),
    };
  },

  // Dạng giống đề mở từ thư mục: mỗi câu có số, ảnh và đáp án đúng (có thể nhiều đáp án, cách nhau bằng dấu cách)
  async getDetail(actor: Actor, id: string) {
    // Thành viên (kể cả admin, ngoài trang quản trị) chưa có đề: chỉ xem thử vài câu đầu (đề có trong Kho đề); khách và đề lạ vẫn 404
    if (isMember(actor.owner) && !(await userExamRepository.has(actor.owner, id))) {
      // Admin sửa đề chưa vào Kho đề (AI đang giải, lỗi...) vẫn cần xem đủ: đề ngoài Kho đề thì rơi xuống kiểm tra quyền thường
      const trial = await catalogService.trialDetail(id, actor.owner.userId).catch((err: unknown) => (actor.isAdmin ? null : Promise.reject(err)));
      // Pro mở đề miễn phí (như crawlJobService.submit): tự thêm vào Kho đề thay vì bắt bấm "Mở khoá"; đề đã qua kiểm tra usableExams nên là đề hợp lệ
      if (trial && PRO_BENEFITS.freeFetch && (await planService.isPro(actor.owner.userId))) await userExamRepository.add(actor.owner, id);
      else if (trial) return trial;
    }
    await this.assertAccess(actor, id);
    await examSolveService.upgradeIfNeeded(id);
    const exam = await examRepository.findDetail(id);
    if (!exam) throw AppError.notFound(EXAM_NOT_FOUND);
    void topicLabelerService.ensure(id); // đề còn câu chưa có chủ đề: gắn nền, kết quả về qua realtime
    return {
      id: exam.id,
      title: exam.title,
      kind: exam.kind ?? "FE", // đề cũ chưa phân loại: coi là FE như catalog
      totalQuestions: exam.totalQuestions, // lớn hơn số câu trả về = đề còn đang được lấy về, các câu sau đến qua socket
      answerStatus: exam.answerSource, // PENDING = AI đang phân tích, FAILED = AI lỗi: cả hai chỉ xem đề, chưa làm bài được
      answerError: failedMessage(exam.answerSource),
      questions: exam.questions.map((q) => ({
        number: q.number,
        imageUrl: imageUrlOf(q.imagePath),
        correct: q.answer.split(/\s+/).filter(Boolean),
        isReference: q.isReference,
        topic: q.topic, // chủ đề theo syllabus môn (null nếu chưa gắn)
      })),
      // Tệp đính kèm không phải ảnh; đề chỉ có tệp thì questions rỗng
      attachments: exam.attachments.map((a) => toAttachmentDto(exam.id, a)),
    };
  },

  // Tệp đính kèm của đề: công khai như ảnh đề (/api/v1/files), chỉ cần đúng cặp đề + tệp
  async getAttachmentFile(examId: string, attachmentId: number) {
    const row = await examAttachmentRepository.find(examId, attachmentId);
    const abs = row && resolveInside(storageDir, row.filePath);
    if (!row || !abs) throw AppError.notFound("Không tìm thấy tệp");
    return { abs, name: row.name, filePath: row.filePath };
  },

  // Giao diện hỏi lại định kỳ trong lúc AI phân tích: chỉ trả trạng thái và đáp án, nhẹ hơn tải cả đề
  async getAnswers(actor: Actor, id: string) {
    await this.assertAccess(actor, id);
    const exam = await examRepository.findAnswers(id);
    if (!exam) throw AppError.notFound(EXAM_NOT_FOUND);
    return toAnswersPayload(exam);
  },

  // Vừa đăng ký/đăng nhập: đề khách đã lấy trên trình duyệt này chuyển về tài khoản
  async claimGuestLibrary(userId: string, guestId: string | undefined) {
    if (!guestId) return { claimed: 0, jobs: 0 };
    // jobs giữ trong phản hồi cho client cũ; không còn lượt lấy đề chạy nền để chuyển
    return { claimed: await userExamRepository.claimGuest(userId, guestId), jobs: 0 };
  },
};

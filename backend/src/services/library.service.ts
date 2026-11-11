import { prisma } from "../configs/prisma";
import { HTTP_STATUS } from "../constants/httpStatus";
import { AppError } from "../rules/error";
import { isExamFree } from "../utils/exam-free";
import { catalogService, termOf } from "./catalog.service";
import { librarySettingService } from "./library-setting.service";

// Thư viện đề thi: quy tắc đề miễn phí và các thao tác chỉnh của admin (kỳ của môn, ghi đè miễn phí)
export const libraryService = {
  /** Đề này (đã lấy xong, có đáp án) có miễn phí cho thành viên không. Đề chưa có đáp án AI/chỉnh tay thì chưa phải đề "sẵn sàng" nên không miễn phí. */
  async isFree(exam: { title: string; answerSource: string; freeOverride: boolean | null }): Promise<boolean> {
    if (exam.answerSource !== "AI" && exam.answerSource !== "MANUAL") return false;
    const cfg = await librarySettingService.get();
    if (!cfg.enabled) return false;
    const newestTerms = cfg.freeRuleEnabled && exam.freeOverride === null ? await catalogService.newestTerms(cfg.newestTermsPaid) : new Set<string>();
    return isExamFree({ freeOverride: exam.freeOverride, term: termOf(exam.title) }, { enabled: cfg.enabled, ruleEnabled: cfg.freeRuleEnabled, newestTerms });
  },

  async setSubjectSemester(code: string, semester: number | null) {
    const subject = await prisma.subject.findUnique({ where: { code: code.toUpperCase() }, select: { id: true } });
    if (!subject) throw new AppError("Không tìm thấy môn này", HTTP_STATUS.NOT_FOUND);
    await prisma.subject.update({ where: { id: subject.id }, data: { semester } });
    return { code: code.toUpperCase(), semester };
  },

  async setExamFree(examId: number, free: boolean | null) {
    const done = await prisma.exam.updateMany({ where: { id: examId }, data: { freeOverride: free } });
    if (done.count === 0) throw new AppError("Không tìm thấy đề này", HTTP_STATUS.NOT_FOUND);
    return { id: examId, free };
  },

  /** Đặt ghi đè miễn phí cho mọi đề của một môn. */
  async setSubjectFree(code: string, free: boolean | null) {
    const done = await prisma.exam.updateMany({ where: { subjectCode: code.toUpperCase() }, data: { freeOverride: free } });
    return { code: code.toUpperCase(), free, updated: done.count };
  },
};

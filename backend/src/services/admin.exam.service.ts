import { examRepository } from "../repositories/exam.repository";
import { AppError } from "../rules/error";
import { toMeta, type PaginationQuery } from "../utils/pagination";
import { aiSettingService } from "./ai-setting.service";
import { examSolveService } from "./exam-solve.service";

export const adminExamService = {
  async list(query: PaginationQuery) {
    const { items, total } = await examRepository.listAll(query);
    return {
      items: items.map((e) => ({
        ...e,
        solving: examSolveService.isBusy(e.id) || e.answerSource === "PENDING",
        solveError: examSolveService.lastError(e.id),
      })),
      meta: toMeta(query, total),
    };
  },

  // Bắt đầu nhờ AI giải lại và trả về ngay (việc này có thể mất vài phút); admin theo dõi ở danh sách
  async solve(id: number) {
    const ai = await aiSettingService.get();
    if (!ai.apiKey) throw new AppError("Chưa cấu hình khóa Gemini ở Quản trị → Cấu hình crawl");
    if (!(await examRepository.findByThreadIdOfId(id))) throw AppError.notFound("Không tìm thấy đề");
    if (!examSolveService.enqueue(id)) throw AppError.conflict("Đề này đang được AI giải");
  },

  async report(id: number) {
    const exam = await examRepository.findReport(id);
    if (!exam) throw AppError.notFound("Không tìm thấy đề");
    return exam;
  },
};

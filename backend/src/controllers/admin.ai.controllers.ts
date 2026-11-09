import type { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { getValidated } from "../middlewares/validate.middlewares";
import type { IdParam, QuestionParam, RenameExamBody, UpdateExamQuestionsBody } from "../rules/requests/admin.request";
import type { UpdateAiBody } from "../rules/requests/setting.request";
import { ResponseClient } from "../rules/response";
import { adminExamService } from "../services/admin.exam.service";
import { aiSettingService } from "../services/ai-setting.service";
import type { PaginationQuery } from "../utils/pagination";

export const adminAiController = {
  async getSettings(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await aiSettingService.getForAdmin() }));
  },

  async updateSettings(_req: Request, res: Response) {
    const data = await aiSettingService.update(getValidated<UpdateAiBody>(res));
    res.json(new ResponseClient({ message: "Đã lưu cấu hình AI", data }));
  },

  async listExams(_req: Request, res: Response) {
    const { items, meta } = await adminExamService.list(getValidated<PaginationQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async solve(_req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    await adminExamService.solve(id);
    res.status(HTTP_STATUS.ACCEPTED).json(new ResponseClient({ message: "AI đang giải lại đáp án, có thể mất vài phút" }));
  },

  async report(_req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    res.json(new ResponseClient({ data: await adminExamService.report(id) }));
  },

  async examDetail(_req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    res.json(new ResponseClient({ data: await adminExamService.detail(id) }));
  },

  async saveQuestions(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    const data = await adminExamService.saveQuestions(req.user!.id, id, getValidated<UpdateExamQuestionsBody>(res));
    res.json(new ResponseClient({ message: "Đã lưu đáp án", data }));
  },

  // AI giải lại MỘT câu: chỉ trả gợi ý, không ghi DB (admin xem rồi lưu bằng nút Lưu như khi sửa tay)
  async resolveQuestion(_req: Request, res: Response) {
    const { id, number } = getValidated<QuestionParam>(res, "params");
    res.json(new ResponseClient({ data: await adminExamService.resolveQuestion(id, number) }));
  },

  async renameExam(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    const data = await adminExamService.rename(req.user!.id, id, getValidated<RenameExamBody>(res));
    res.json(new ResponseClient({ message: "Đã đổi tên đề", data }));
  },

  async removeExam(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    await adminExamService.remove(req.user!.id, id);
    res.json(new ResponseClient({ message: "Đã xoá đề" }));
  },
};

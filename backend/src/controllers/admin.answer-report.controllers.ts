import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UuidParam } from "../rules/requests/admin.request";
import type { ListReportsQuery, ReviewReportBody } from "../rules/requests/answer-report.request";
import { ResponseClient } from "../rules/response";
import { answerReportService } from "../services/answer-report.service";
import { examContributionService } from "../services/exam-contribution.service";
import { explanationFeedbackService } from "../services/explanation-feedback.service";

export const adminAnswerReportController = {
  async list(_req: Request, res: Response) {
    const { items, meta } = await answerReportService.list(getValidated<ListReportsQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async approve(req: Request, res: Response) {
    const { id } = getValidated<UuidParam>(res, "params");
    const data = await answerReportService.approve(req.user!.id, id, getValidated<ReviewReportBody>(res));
    res.json(new ResponseClient({ message: "Đã duyệt, đáp án được cập nhật và người báo cáo nhận thưởng", data }));
  },

  async reject(req: Request, res: Response) {
    const { id } = getValidated<UuidParam>(res, "params");
    res.json(new ResponseClient({ message: "Đã từ chối báo cáo", data: await answerReportService.reject(req.user!.id, id, getValidated<ReviewReportBody>(res)) }));
  },

  async resolve(req: Request, res: Response) {
    const { id } = getValidated<UuidParam>(res, "params");
    res.json(new ResponseClient({ message: "Đã đánh dấu đã giải quyết", data: await answerReportService.resolve(req.user!.id, id) }));
  },

  // Số mục chờ admin xử lý cho badge sidebar: báo cáo đáp án, lời chê lời giải AI chưa giải quyết, đề đóng góp chờ duyệt
  async reviewCounts(_req: Request, res: Response) {
    const [reports, feedback, contributions] = await Promise.all([answerReportService.countPending(), explanationFeedbackService.countPending(), examContributionService.countPending()]);
    res.json(new ResponseClient({ data: { reports, feedback, contributions } }));
  },
};

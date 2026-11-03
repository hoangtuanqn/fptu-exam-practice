import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { IdParam } from "../rules/requests/admin.request";
import type { ListReportsQuery, ReviewReportBody } from "../rules/requests/answer-report.request";
import { ResponseClient } from "../rules/response";
import { answerReportService } from "../services/answer-report.service";

export const adminAnswerReportController = {
  async list(_req: Request, res: Response) {
    const { items, meta } = await answerReportService.list(getValidated<ListReportsQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async approve(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    const data = await answerReportService.approve(req.user!.id, id, getValidated<ReviewReportBody>(res));
    res.json(new ResponseClient({ message: "Đã duyệt, đáp án được cập nhật và người báo cáo nhận thưởng", data }));
  },

  async reject(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    res.json(new ResponseClient({ message: "Đã từ chối báo cáo", data: await answerReportService.reject(req.user!.id, id, getValidated<ReviewReportBody>(res)) }));
  },
};

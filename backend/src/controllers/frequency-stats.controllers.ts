import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import { ResponseClient } from "../rules/response";
import type { HotQuestionsQuery, SubjectIdParam } from "../rules/requests/frequency-stats.request";
import { frequencyStatsService } from "../services/frequency-stats.service";

export const frequencyStatsController = {
  // Công khai: số đề có từng chương, trung bình số câu mỗi đề, điểm gần đây
  async chapterStats(_req: Request, res: Response) {
    const { id } = getValidated<SubjectIdParam>(res, "params");
    res.json(new ResponseClient({ data: await frequencyStatsService.chapterStats(id) }));
  },

  // Nhóm câu ra lại ở nhiều đề; gói thường chỉ nhận phần đầu
  async hotQuestions(req: Request, res: Response) {
    const { id } = getValidated<SubjectIdParam>(res, "params");
    const { limit } = getValidated<HotQuestionsQuery>(res, "query");
    res.json(new ResponseClient({ data: await frequencyStatsService.hotQuestions(id, limit, req.user) }));
  },
};

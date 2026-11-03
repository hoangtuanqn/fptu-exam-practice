import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { ExamIdParam, ExplainBody } from "../rules/requests/explanation.request";
import { ResponseClient } from "../rules/response";
import { explanationService } from "../services/explanation.service";
import { actorOf } from "../utils/actor";

// Dành cho thành viên đã đăng nhập
export const explanationController = {
  async info(req: Request, res: Response) {
    const { examId } = getValidated<ExamIdParam>(res, "params");
    res.json(new ResponseClient({ data: await explanationService.info(actorOf(req), req.user!.id, examId) }));
  },

  async explain(req: Request, res: Response) {
    const { examId, questionNumber } = getValidated<ExplainBody>(res);
    res.json(new ResponseClient({ data: await explanationService.explain(actorOf(req), req.user!.id, examId, questionNumber) }));
  },
};

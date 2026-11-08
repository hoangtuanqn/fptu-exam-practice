import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { AskBody } from "../rules/requests/ask.request";
import { askService } from "../services/ask.service";
import type { ExamIdParam, ExplainBody, UnlockBody } from "../rules/requests/explanation.request";
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

  async askQuota(req: Request, res: Response) {
    res.json(new ResponseClient({ data: await askService.quota(req.user!.id, req.user) }));
  },

  async ask(req: Request, res: Response) {
    res.json(new ResponseClient({ data: await askService.ask(actorOf(req), req.user!, getValidated<AskBody>(res)) }));
  },

  async unlock(req: Request, res: Response) {
    const { examId, price } = getValidated<UnlockBody>(res);
    res.json(new ResponseClient({ data: await explanationService.unlock(actorOf(req), req.user!.id, examId, price) }));
  },
};

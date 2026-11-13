import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { ExamIdParam, ExplainBody, ExplainChatBody, ExplainFeedbackBody, UnlockBody } from "../rules/requests/explanation.request";
import { ResponseClient } from "../rules/response";
import { explanationFeedbackService } from "../services/explanation-feedback.service";
import { explainChatService } from "../services/explain-chat.service";
import { explanationService } from "../services/explanation.service";
import { actorOf } from "../utils/actor";

// Dành cho thành viên đã đăng nhập
export const explanationController = {
  async info(req: Request, res: Response) {
    const { examId } = getValidated<ExamIdParam>(res, "params");
    res.json(new ResponseClient({ data: await explanationService.info(actorOf(req), req.user!.id, examId) }));
  },

  async explain(req: Request, res: Response) {
    const { examId, questionNumber, useFreeTurn } = getValidated<ExplainBody>(res);
    res.json(new ResponseClient({ data: await explanationService.explain(actorOf(req), req.user!.id, examId, questionNumber, useFreeTurn === true) }));
  },

  async chat(req: Request, res: Response) {
    const { examId, questionNumber, messages } = getValidated<ExplainChatBody>(res);
    res.json(new ResponseClient({ data: await explainChatService.chat(actorOf(req), req.user!.id, examId, questionNumber, messages) }));
  },

  async chatQuota(req: Request, res: Response) {
    res.json(new ResponseClient({ data: { quota: await explainChatService.quota(req.user!.id) } }));
  },

  async feedback(req: Request, res: Response) {
    res.json(new ResponseClient({ message: "Cảm ơn bạn đã đánh giá", data: await explanationFeedbackService.submit(actorOf(req), req.user!.id, getValidated<ExplainFeedbackBody>(res)) }));
  },

  async unlock(req: Request, res: Response) {
    const { examId, price } = getValidated<UnlockBody>(res);
    res.json(new ResponseClient({ data: await explanationService.unlock(actorOf(req), req.user!.id, examId, price) }));
  },
};

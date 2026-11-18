import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UuidParam } from "../rules/requests/admin.request";
import type { ListFeedbackQuery } from "../rules/requests/explanation.request";
import { ResponseClient } from "../rules/response";
import { explanationFeedbackService } from "../services/explanation-feedback.service";

export const adminExplanationFeedbackController = {
  async list(_req: Request, res: Response) {
    const { items, meta } = await explanationFeedbackService.adminList(getValidated<ListFeedbackQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async summary(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await explanationFeedbackService.adminSummary() }));
  },

  async resolve(req: Request, res: Response) {
    const { id } = getValidated<UuidParam>(res, "params");
    res.json(new ResponseClient({ message: "Đã đánh dấu đã giải quyết", data: await explanationFeedbackService.adminResolve(req.user!.id, id) }));
  },
};

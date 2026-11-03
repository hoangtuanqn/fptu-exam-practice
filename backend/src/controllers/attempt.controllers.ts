import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { IdParam } from "../rules/requests/admin.request";
import type { ListAttemptsQuery } from "../rules/requests/attempt.request";
import { ResponseClient } from "../rules/response";
import { attemptService } from "../services/attempt.service";

export const attemptController = {
  async list(req: Request, res: Response) {
    const { items, meta } = await attemptService.listMine(req.user!.id, getValidated<ListAttemptsQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async get(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    res.json(new ResponseClient({ data: await attemptService.getMine(req.user!.id, id) }));
  },
};

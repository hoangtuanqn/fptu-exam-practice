import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { ListDepositsQuery } from "../rules/requests/deposit.request";
import { ResponseClient } from "../rules/response";
import { depositService } from "../services/deposit.service";

export const adminDepositController = {
  async list(_req: Request, res: Response) {
    const query = getValidated<ListDepositsQuery>(res, "query");
    const { items, meta } = await depositService.list(query, query.userId, true);
    res.json(new ResponseClient({ data: items, meta }));
  },
};

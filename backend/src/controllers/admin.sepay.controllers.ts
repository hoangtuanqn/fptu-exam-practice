import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { ListBankTxQuery } from "../rules/requests/deposit.request";
import { ResponseClient } from "../rules/response";
import { toMeta } from "../utils/pagination";
import { sepayService } from "../services/sepay.service";

export const adminSepayController = {
  async status(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await sepayService.lastRun() }));
  },

  // Nút "Chạy ngay" trên panel
  async syncNow(_req: Request, res: Response) {
    const result = await sepayService.sync();
    res.json(new ResponseClient({ message: result.message, data: result }));
  },

  async bankTransactions(_req: Request, res: Response) {
    const query = getValidated<ListBankTxQuery>(res, "query");
    const { items, total } = await sepayService.listBankTransactions(query, query.status);
    res.json(new ResponseClient({ data: items, meta: toMeta(query, total) }));
  },
};

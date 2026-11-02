import type { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { getValidated } from "../middlewares/validate.middlewares";
import type { IdParam } from "../rules/requests/admin.request";
import type { CreateDepositBody, ListDepositsQuery } from "../rules/requests/deposit.request";
import { ResponseClient } from "../rules/response";
import { depositService } from "../services/deposit.service";

export const depositController = {
  async info(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await depositService.info() }));
  },

  async create(req: Request, res: Response) {
    const data = await depositService.create(req.user!.id, getValidated<CreateDepositBody>(res));
    res.status(HTTP_STATUS.CREATED).json(new ResponseClient({ message: "Đã tạo lệnh nạp", data }));
  },

  async list(req: Request, res: Response) {
    const { items, meta } = await depositService.list(getValidated<ListDepositsQuery>(res, "query"), req.user!.id);
    res.json(new ResponseClient({ data: items, meta }));
  },

  async get(req: Request, res: Response) {
    const { id } = getValidated<IdParam>(res, "params");
    res.json(new ResponseClient({ data: await depositService.getOfUser(req.user!.id, id) }));
  },
};

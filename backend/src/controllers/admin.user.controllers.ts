import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { AdjustBalanceBody, IdParam, ListUsersQuery, UpdateUserBody } from "../rules/requests/admin.request";
import { ResponseClient } from "../rules/response";
import { adminUserService } from "../services/admin.user.service";

const idOf = (res: Response) => getValidated<IdParam>(res, "params").id;

export const adminUserController = {
  async list(_req: Request, res: Response) {
    const { items, meta } = await adminUserService.list(getValidated<ListUsersQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async get(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await adminUserService.get(idOf(res)) }));
  },

  async update(req: Request, res: Response) {
    const data = await adminUserService.update(req.user!, idOf(res), getValidated<UpdateUserBody>(res));
    res.json(new ResponseClient({ message: "Đã cập nhật thành viên", data }));
  },

  async adjustBalance(_req: Request, res: Response) {
    const data = await adminUserService.adjustBalance(idOf(res), getValidated<AdjustBalanceBody>(res));
    res.json(new ResponseClient({ message: "Đã điều chỉnh số dư", data }));
  },
};

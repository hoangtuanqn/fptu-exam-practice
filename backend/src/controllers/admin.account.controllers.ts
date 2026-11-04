import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UpdateAccountBody } from "../rules/requests/setting.request";
import { ResponseClient } from "../rules/response";
import { accountSettingService } from "../services/account-setting.service";

export const adminAccountController = {
  async get(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await accountSettingService.get() }));
  },

  async update(_req: Request, res: Response) {
    res.json(new ResponseClient({ message: "Đã lưu cấu hình tài khoản", data: await accountSettingService.update(getValidated<UpdateAccountBody>(res)) }));
  },
};

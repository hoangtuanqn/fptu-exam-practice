import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UpdateSepayBody } from "../rules/requests/setting.request";
import { ResponseClient } from "../rules/response";
import { settingService } from "../services/setting.service";

export const adminSettingController = {
  async getSepay(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await settingService.getSepayForAdmin() }));
  },

  async updateSepay(_req: Request, res: Response) {
    const data = await settingService.updateSepay(getValidated<UpdateSepayBody>(res));
    res.json(new ResponseClient({ message: "Đã lưu cấu hình SePay", data }));
  },
};

import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UpdateAdsBody } from "../rules/requests/setting.request";
import { ResponseClient } from "../rules/response";
import { adSettingService } from "../services/ad-setting.service";

export const adminAdsController = {
  async get(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await adSettingService.get() }));
  },

  async update(_req: Request, res: Response) {
    res.json(new ResponseClient({ message: "Đã lưu cấu hình quảng cáo", data: await adSettingService.update(getValidated<UpdateAdsBody>(res)) }));
  },
};

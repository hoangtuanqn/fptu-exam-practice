import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UpdatePromoBody } from "../rules/requests/setting.request";
import { ResponseClient } from "../rules/response";
import { promoSettingService } from "../services/promo-setting.service";

export const adminPromoController = {
  async get(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await promoSettingService.get() }));
  },

  async update(_req: Request, res: Response) {
    res.json(new ResponseClient({ message: "Đã lưu cấu hình ưu đãi", data: await promoSettingService.update(getValidated<UpdatePromoBody>(res)) }));
  },
};

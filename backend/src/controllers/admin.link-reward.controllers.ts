import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UpdateLinkRewardBody } from "../rules/requests/setting.request";
import { ResponseClient } from "../rules/response";
import { linkRewardService } from "../services/link-reward.service";
import { linkRewardSettingService } from "../services/link-reward-setting.service";

export const adminLinkRewardController = {
  // Cấu hình (không có token) kèm số liệu
  async get(_req: Request, res: Response) {
    const [settings, stats] = await Promise.all([linkRewardSettingService.getAdmin(), linkRewardService.stats()]);
    res.json(new ResponseClient({ data: { ...settings, stats } }));
  },

  async update(_req: Request, res: Response) {
    const settings = await linkRewardSettingService.update(getValidated<UpdateLinkRewardBody>(res));
    res.json(new ResponseClient({ message: "Đã lưu cấu hình vượt link", data: { ...settings, stats: await linkRewardService.stats() } }));
  },
};

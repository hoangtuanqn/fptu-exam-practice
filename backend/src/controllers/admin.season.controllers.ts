import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UpdateSeasonBody } from "../rules/requests/setting.request";
import { ResponseClient } from "../rules/response";
import { seasonSettingService } from "../services/season-setting.service";

export const adminSeasonController = {
  async get(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await seasonSettingService.get() }));
  },

  async update(_req: Request, res: Response) {
    res.json(new ResponseClient({ message: "Đã lưu giao diện theo mùa", data: await seasonSettingService.update(getValidated<UpdateSeasonBody>(res)) }));
  },
};

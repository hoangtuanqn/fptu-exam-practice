import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UpdateCrawlerBody } from "../rules/requests/setting.request";
import { ResponseClient } from "../rules/response";
import { crawlerSettingService } from "../services/crawler-setting.service";

export const adminCrawlerController = {
  async get(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await crawlerSettingService.getForAdmin() }));
  },

  async update(_req: Request, res: Response) {
    const data = await crawlerSettingService.update(getValidated<UpdateCrawlerBody>(res));
    res.json(new ResponseClient({ message: "Đã lưu cấu hình crawl", data }));
  },
};

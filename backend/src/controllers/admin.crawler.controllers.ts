import type { Request, Response } from "express";
import { AppError } from "../rules/error";
import { getValidated } from "../middlewares/validate.middlewares";
import type { UpdateCrawlerBody } from "../rules/requests/setting.request";
import { ResponseClient } from "../rules/response";
import { fuoSessionService } from "../services/crawler/fuo-session.service";
import { crawlerSettingService } from "../services/crawler-setting.service";

export const adminCrawlerController = {
  async get(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await crawlerSettingService.getForAdmin() }));
  },

  async update(_req: Request, res: Response) {
    const data = await crawlerSettingService.update(getValidated<UpdateCrawlerBody>(res));
    res.json(new ResponseClient({ message: "Đã lưu cấu hình crawl", data }));
  },

  // Admin bấm "Đăng nhập ngay": đăng nhập bằng tài khoản đã lưu và lưu cookie mới
  async login(_req: Request, res: Response) {
    const result = await fuoSessionService.login(true);
    if (!result.ok) throw new AppError(result.message);
    res.json(new ResponseClient({ message: "Đã đăng nhập FuOverflow và làm mới cookie", data: await crawlerSettingService.getForAdmin() }));
  },
};

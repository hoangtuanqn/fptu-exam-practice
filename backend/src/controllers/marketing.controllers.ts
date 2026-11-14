import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { ClickQuery, UnsubscribeBody, UnsubscribeQuery } from "../rules/requests/marketing.request";
import { ResponseClient } from "../rules/response";
import { marketingService } from "../services/marketing.service";

export const marketingController = {
  // Công khai: liên kết/nút hủy trong thư marketing
  async unsubscribe(_req: Request, res: Response) {
    const token = getValidated<UnsubscribeQuery>(res, "query").t ?? getValidated<UnsubscribeBody>(res)?.token ?? "";
    res.json(new ResponseClient({ message: "Đã hủy nhận thư", data: await marketingService.unsubscribe(token) }));
  },

  // Công khai: nút trong thư marketing, chuyển hướng 302 tới trang đích đã lưu
  async click(_req: Request, res: Response) {
    res.redirect(302, await marketingService.click(getValidated<ClickQuery>(res, "query").t ?? ""));
  },
};

import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { ClickQuery, UnsubscribeBody, UnsubscribeQuery } from "../rules/requests/marketing.request";
import { ResponseClient } from "../rules/response";
import { marketingService, type UnsubscribeMode } from "../services/marketing.service";

const UNSUBSCRIBE_MESSAGES: Record<UnsubscribeMode, string> = { all: "Đã hủy nhận thư", pause: "Đã tạm dừng thư 30 ngày", topic: "Đã tắt loại thư này" };

export const marketingController = {
  // Công khai: liên kết/nút hủy trong thư marketing
  async unsubscribe(_req: Request, res: Response) {
    const query = getValidated<UnsubscribeQuery>(res, "query").t;
    const body = getValidated<UnsubscribeBody>(res);
    // Nút một chạm (token trong query) luôn là huỷ tất cả
    const data = query ? await marketingService.unsubscribe(query) : await marketingService.unsubscribe(body?.token ?? "", body?.mode, body?.topic);
    res.json(new ResponseClient({ message: UNSUBSCRIBE_MESSAGES[data.mode], data }));
  },

  // Công khai: nút trong thư marketing, chuyển hướng 302 tới trang đích đã lưu
  async click(_req: Request, res: Response) {
    res.redirect(302, await marketingService.click(getValidated<ClickQuery>(res, "query").t ?? ""));
  },
};

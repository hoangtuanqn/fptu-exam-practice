import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { RedeemGiftCodeBody } from "../rules/requests/gift-code.request";
import { ResponseClient } from "../rules/response";
import { giftCodeService } from "../services/gift-code.service";
import type { PaginationQuery } from "../utils/pagination";

// Dành cho thành viên đã đăng nhập
export const giftCodeController = {
  async redeem(req: Request, res: Response) {
    const { code } = getValidated<RedeemGiftCodeBody>(res);
    const data = await giftCodeService.redeem(req.user!.id, code);
    res.json(new ResponseClient({ message: `Đã nhận ${data.amount.toLocaleString("vi-VN")} credit`, data }));
  },

  async mine(req: Request, res: Response) {
    const { items, meta } = await giftCodeService.mine(req.user!.id, getValidated<PaginationQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },
};

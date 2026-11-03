import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import { ResponseClient } from "../rules/response";
import type { ReferralCodeParam } from "../rules/requests/referral.request";
import { referralService } from "../services/referral.service";
import type { PaginationQuery } from "../utils/pagination";

export const referralController = {
  // Thành viên: mã, thống kê và danh sách người mình đã giới thiệu
  async me(req: Request, res: Response) {
    const { items, meta, ...rest } = await referralService.overview(req.user!.id, getValidated<PaginationQuery>(res, "query"));
    res.json(new ResponseClient({ data: { ...rest, items }, meta }));
  },

  // Công khai: mã trên liên kết giới thiệu có hợp lệ không
  async publicInfo(_req: Request, res: Response) {
    const { code } = getValidated<ReferralCodeParam>(res, "params");
    res.json(new ResponseClient({ data: await referralService.publicInfo(code) }));
  },
};

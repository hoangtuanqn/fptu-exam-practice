import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import { ResponseClient } from "../rules/response";
import type { UpdateReferralBody } from "../rules/requests/setting.request";
import { referralService } from "../services/referral.service";
import { referralSettingService } from "../services/referral-setting.service";
import type { ListAdminReferralsQuery } from "../rules/requests/referral.request";

export const adminReferralController = {
  async getSettings(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await referralSettingService.get() }));
  },

  async updateSettings(_req: Request, res: Response) {
    res.json(new ResponseClient({ message: "Đã lưu cấu hình giới thiệu", data: await referralSettingService.update(getValidated<UpdateReferralBody>(res)) }));
  },

  async summary(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await referralService.adminSummary() }));
  },

  async list(_req: Request, res: Response) {
    const { items, meta } = await referralService.adminList(getValidated<ListAdminReferralsQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },
};

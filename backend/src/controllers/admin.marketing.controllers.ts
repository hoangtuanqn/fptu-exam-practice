import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { CampaignKeyParam, SetCampaignBody } from "../rules/requests/marketing.request";
import { ResponseClient } from "../rules/response";
import { marketingService } from "../services/marketing.service";

const keyOf = (res: Response) => getValidated<CampaignKeyParam>(res, "params").key;

export const adminMarketingController = {
  async campaigns(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await marketingService.campaigns() }));
  },

  async setEnabled(_req: Request, res: Response) {
    const data = await marketingService.setEnabled(keyOf(res), getValidated<SetCampaignBody>(res).enabled);
    res.json(new ResponseClient({ message: data.enabled ? "Đã bật chiến dịch" : "Đã tắt chiến dịch", data }));
  },

  async sendTest(req: Request, res: Response) {
    res.json(new ResponseClient({ message: "Đã gửi thư mẫu tới email của bạn", data: await marketingService.sendTest(keyOf(res), req.user!) }));
  },

  async eligibleCount(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await marketingService.eligibleCounts() }));
  },
};

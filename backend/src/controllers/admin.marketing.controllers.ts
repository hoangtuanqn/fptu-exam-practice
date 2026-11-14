import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { CampaignKeyParam, PreviewQuery, SetCampaignBody, SetParamsBody, SetPausedBody } from "../rules/requests/marketing.request";
import { ResponseClient } from "../rules/response";
import { marketingService } from "../services/marketing.service";
import { marketingSettingService } from "../services/marketing-setting.service";
import { marketingStatsService } from "../services/marketing-stats.service";

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

  async overview(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await marketingStatsService.overview() }));
  },

  async setPaused(_req: Request, res: Response) {
    const paused = await marketingSettingService.setPaused(getValidated<SetPausedBody>(res).paused);
    res.json(new ResponseClient({ message: paused ? "Đã tạm dừng mọi thư marketing" : "Đã tiếp tục gửi thư marketing", data: { paused } }));
  },

  async params(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await marketingService.params() }));
  },

  async setParams(_req: Request, res: Response) {
    res.json(new ResponseClient({ message: "Đã lưu tham số", data: await marketingService.setParams(getValidated<SetParamsBody>(res)) }));
  },

  async resetParams(_req: Request, res: Response) {
    res.json(new ResponseClient({ message: "Đã khôi phục mặc định", data: await marketingService.resetParams() }));
  },

  async preview(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await marketingService.preview(keyOf(res), getValidated<PreviewQuery>(res, "query").step) }));
  },
};

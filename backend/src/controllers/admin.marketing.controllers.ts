import type { Request, Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { getValidated } from "../middlewares/validate.middlewares";
import type { IdParam } from "../rules/requests/admin.request";
import type {
  CampaignKeyParam,
  CreateBroadcastBody,
  ListBroadcastsQuery,
  ListLogsQuery,
  PreviewQuery,
  SetCampaignBody,
  SetParamsBody,
  SetPausedBody,
  StartBroadcastBody,
} from "../rules/requests/marketing.request";
import { ResponseClient } from "../rules/response";
import { marketingService } from "../services/marketing.service";
import { marketingBroadcastService } from "../services/marketing-broadcast.service";
import { marketingSettingService } from "../services/marketing-setting.service";
import { marketingStatsService } from "../services/marketing-stats.service";
import { toMeta } from "../utils/pagination";

const keyOf = (res: Response) => getValidated<CampaignKeyParam>(res, "params").key;
const idOf = (res: Response) => getValidated<IdParam>(res, "params").id;

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

  async logs(_req: Request, res: Response) {
    const query = getValidated<ListLogsQuery>(res, "query");
    const { items, total } = await marketingStatsService.logs(query);
    res.json(new ResponseClient({ data: items, meta: toMeta(query, total) }));
  },

  // ---- Gửi thủ công

  async createBroadcast(req: Request, res: Response) {
    res.status(HTTP_STATUS.CREATED).json(new ResponseClient({ message: "Đã lưu bản nháp", data: await marketingBroadcastService.create(getValidated<CreateBroadcastBody>(res), req.user!.id) }));
  },

  async broadcasts(_req: Request, res: Response) {
    const query = getValidated<ListBroadcastsQuery>(res, "query");
    const { items, total } = await marketingBroadcastService.list(query);
    res.json(new ResponseClient({ data: items, meta: toMeta(query, total) }));
  },

  async estimateBroadcast(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await marketingBroadcastService.estimate(idOf(res)) }));
  },

  async previewBroadcast(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await marketingBroadcastService.preview(idOf(res)) }));
  },

  async testBroadcast(req: Request, res: Response) {
    res.json(new ResponseClient({ message: "Đã gửi thư mẫu tới email của bạn", data: await marketingBroadcastService.sendTest(idOf(res), req.user!) }));
  },

  async startBroadcast(_req: Request, res: Response) {
    res.json(new ResponseClient({ message: "Đã xếp lịch gửi, thư bắt đầu đi ở lượt chạy kế tiếp", data: await marketingBroadcastService.start(idOf(res), getValidated<StartBroadcastBody>(res)?.confirm) }));
  },

  async cancelBroadcast(_req: Request, res: Response) {
    res.json(new ResponseClient({ message: "Đã dừng gửi", data: await marketingBroadcastService.cancel(idOf(res)) }));
  },
};

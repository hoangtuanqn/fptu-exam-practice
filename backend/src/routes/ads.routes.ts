import { Router } from "express";
import type { Request, Response } from "express";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { ResponseClient } from "../rules/response";
import { adSettingService } from "../services/ad-setting.service";

const adsRouter = Router();

// Công khai (khách cũng cần biết có nạp quảng cáo hay không). Chỉ trả những gì trình duyệt cần, không có gì nhạy cảm.
adsRouter.get("/config", makeLimiter({ limit: 120 }), async (_req: Request, res: Response) => {
  res.json(new ResponseClient({ data: await adSettingService.publicConfig() }));
});

export default adsRouter;

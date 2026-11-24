import { Router } from "express";
import type { Request, Response } from "express";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { ResponseClient } from "../rules/response";
import { seasonSettingService } from "../services/season-setting.service";

const limiter = makeLimiter({ limit: 240 });

const seasonPublicRouter = Router();

// Giao diện theo mùa đang bật hay không (ngày kết thúc do giao diện tự áp); cho trình duyệt nhớ 1 phút
seasonPublicRouter.get("/", limiter, async (_req: Request, res: Response) => {
  res.set("Cache-Control", "public, max-age=60").json(new ResponseClient({ data: { xmas: await seasonSettingService.isXmasOn() } }));
});

export default seasonPublicRouter;

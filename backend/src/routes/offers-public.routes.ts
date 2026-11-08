import { Router } from "express";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import type { Request, Response } from "express";
import { ResponseClient } from "../rules/response";
import { offersService } from "../services/offers.service";

const limiter = makeLimiter({ limit: 240 });

const offersPublicRouter = Router();

// Các con số ưu đãi hiện hành (đọc từ cấu hình admin) để trang chủ luôn khớp số tiền thật
offersPublicRouter.get("/", limiter, async (_req: Request, res: Response) => {
  res.json(new ResponseClient({ data: await offersService.get() }));
});

export default offersPublicRouter;

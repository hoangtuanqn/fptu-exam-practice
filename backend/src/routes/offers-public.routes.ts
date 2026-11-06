import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { ResponseClient } from "../rules/response";
import { offersService } from "../services/offers.service";

const limiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false, message: { status: false, message: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút" } });

const offersPublicRouter = Router();

// Các con số ưu đãi hiện hành (đọc từ cấu hình admin) để trang chủ luôn khớp số tiền thật
offersPublicRouter.get("/", limiter, async (_req: Request, res: Response) => {
  res.json(new ResponseClient({ data: await offersService.get() }));
});

export default offersPublicRouter;

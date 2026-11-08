import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { authenticate, requireVerifiedMember } from "../middlewares/auth.middlewares";
import { idempotent } from "../middlewares/idempotency.middlewares";
import { ResponseClient } from "../rules/response";
import { planService } from "../services/plan.service";

const limiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false, message: { status: false, message: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút" } });

const planRouter = Router();

// Công khai: trang giới thiệu gói hiện cho cả khách
planRouter.get("/", limiter, (_req: Request, res: Response) => {
  res.json(new ResponseClient({ data: planService.info() }));
});

// Mua / gia hạn: cần đăng nhập + email đã xác minh (dịch vụ trừ credit); chống bấm đúp bằng idempotent
planRouter.post("/purchase", authenticate, requireVerifiedMember, idempotent, limiter, async (req: Request, res: Response) => {
  const data = await planService.purchase(req.user!.id);
  res.json(new ResponseClient({ message: data.renewed ? "Đã gia hạn gói Pro" : "Đã kích hoạt gói Pro", data }));
});

export default planRouter;

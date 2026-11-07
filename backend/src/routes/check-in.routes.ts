import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import { authenticate, requireVerifiedMember } from "../middlewares/auth.middlewares";
import { ResponseClient } from "../rules/response";
import { checkInService } from "../services/check-in.service";

const limiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { status: false, message: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút" } });

const checkInRouter = Router();

checkInRouter.use(authenticate);

// Tình trạng điểm danh hôm nay (giao diện hỏi ngay sau khi đăng nhập để hiện hộp nhận thưởng)
checkInRouter.get("/", limiter, async (req: Request, res: Response) => {
  res.json(new ResponseClient({ data: await checkInService.status(req.user!.id, !!req.user!.emailVerifiedAt) }));
});

// Nhận thưởng hôm nay (cần email đã xác minh)
checkInRouter.post("/claim", requireVerifiedMember, limiter, async (req: Request, res: Response) => {
  const data = await checkInService.claim(req.user!.id);
  res.json(new ResponseClient({ message: `Đã nhận ${data.amount.toLocaleString("vi-VN")} credit`, data }));
});

export default checkInRouter;

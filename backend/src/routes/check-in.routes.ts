import { Router } from "express";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import type { Request, Response } from "express";
import { authenticate, requireVerifiedMember } from "../middlewares/auth.middlewares";
import { ResponseClient } from "../rules/response";
import { checkInService } from "../services/check-in.service";

const limiter = makeLimiter({ limit: 120 });

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

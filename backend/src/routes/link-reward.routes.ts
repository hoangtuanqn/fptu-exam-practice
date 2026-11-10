import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { authenticate, requireVerifiedMember } from "../middlewares/auth.middlewares";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { getValidated, validate } from "../middlewares/validate.middlewares";
import { ResponseClient } from "../rules/response";
import { linkRewardService } from "../services/link-reward.service";

// Vượt link nhận lượt giải thích miễn phí. Chỉ thành viên đã đăng nhập (và xác minh email) mới tạo link và nhận lượt.
const claimBody = z.object({ token: z.string().trim().min(20, "Mã không hợp lệ").max(64, "Mã không hợp lệ") });

const linkRewardRouter = Router();
linkRewardRouter.use(authenticate);

linkRewardRouter.get("/status", makeLimiter({ limit: 60 }), async (req: Request, res: Response) => {
  res.json(new ResponseClient({ data: await linkRewardService.status(req.user!.id) }));
});

// Tạo link (gọi Link4M): giới hạn chặt vì mỗi lần là một yêu cầu ra ngoài
linkRewardRouter.post("/start", requireVerifiedMember, makeLimiter({ limit: 10 }), async (req: Request, res: Response) => {
  res.json(new ResponseClient({ data: await linkRewardService.start(req.user!.id) }));
});

linkRewardRouter.post("/claim", requireVerifiedMember, makeLimiter({ limit: 20 }), validate(claimBody), async (req: Request, res: Response) => {
  const { token } = getValidated<z.infer<typeof claimBody>>(res);
  const data = await linkRewardService.claim(req.user!.id, token);
  res.json(new ResponseClient({ message: data.granted ? "Đã nhận 1 lượt giải thích miễn phí" : "Bạn đã nhận lượt từ liên kết này rồi", data }));
});

export default linkRewardRouter;

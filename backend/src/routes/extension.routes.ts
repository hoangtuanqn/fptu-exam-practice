import { Router } from "express";
import { authenticate } from "../middlewares/auth.middlewares";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { extensionService } from "../services/extension.service";

// Chỉ người đã đăng nhập mới tải được tiện ích (không còn file zip công khai trên website)
const limiter = makeLimiter({ windowMs: 60 * 60 * 1000, limit: 30, message: "Bạn đã tải tiện ích quá nhiều lần trong thời gian ngắn." });

const extensionRouter = Router();
extensionRouter.use(authenticate);
extensionRouter.get("/download", limiter, (_req, res) => {
  const { zip } = extensionService.pack();
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", 'attachment; filename="fepass_extension.zip"');
  res.setHeader("Cache-Control", "private, no-store");
  res.send(zip);
});

export default extensionRouter;

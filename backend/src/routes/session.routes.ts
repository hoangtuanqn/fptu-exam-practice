import { Router } from "express";
import rateLimit from "express-rate-limit";
import { practiceSessionController } from "../controllers/practice-session.controllers";
import { identify } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { idParam } from "../rules/requests/admin.request";
import { listSessionsQuery, saveSessionBody } from "../rules/requests/session.request";

// Lượt làm bài dở dang: khách cũng dùng được (theo X-Guest-Id), nhận về tài khoản khi đăng ký/đăng nhập
// Tự lưu tiến độ gửi request liên tục lúc làm bài; giới hạn theo người dùng/khách để một client lỗi không làm DB quá tải
const saveLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 90,
  keyGenerator: (req) => (req.user ? `u${req.user.id}` : `g${req.guestId ?? req.ip}`),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  message: { status: false, message: "Lưu tiến độ quá nhanh, vui lòng thử lại sau giây lát" },
});

const sessionRouter = Router();

sessionRouter.use(identify);

sessionRouter.get("/", validate(listSessionsQuery, "query"), practiceSessionController.list);
sessionRouter.get("/:id", validate(idParam, "params"), practiceSessionController.get);
sessionRouter.put("/:id", saveLimiter, validate(idParam, "params"), validate(saveSessionBody), practiceSessionController.save);
sessionRouter.delete("/:id", validate(idParam, "params"), practiceSessionController.remove);

export default sessionRouter;

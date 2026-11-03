import { Router } from "express";
import rateLimit from "express-rate-limit";
import { depositController } from "../controllers/deposit.controllers";
import { validate } from "../middlewares/validate.middlewares";
import { depositCodeParam } from "../rules/requests/deposit.request";

// Không cần đăng nhập nên giới hạn theo IP để không ai dò mã nạp hàng loạt (mã dài 8 ký tự ngẫu nhiên, khó đoán)
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: false, message: "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút" },
});

const depositPublicRouter = Router();

depositPublicRouter.get("/:code", publicLimiter, validate(depositCodeParam, "params"), depositController.getPublic);

export default depositPublicRouter;

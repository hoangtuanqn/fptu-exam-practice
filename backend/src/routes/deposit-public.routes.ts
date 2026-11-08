import { Router } from "express";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { depositController } from "../controllers/deposit.controllers";
import { validate } from "../middlewares/validate.middlewares";
import { depositCodeParam } from "../rules/requests/deposit.request";

// Không cần đăng nhập nên giới hạn theo IP để không ai dò mã nạp hàng loạt (mã dài 8 ký tự ngẫu nhiên, khó đoán)
const publicLimiter = makeLimiter({ limit: 120 });

const depositPublicRouter = Router();

depositPublicRouter.get("/:code", publicLimiter, validate(depositCodeParam, "params"), depositController.getPublic);

export default depositPublicRouter;

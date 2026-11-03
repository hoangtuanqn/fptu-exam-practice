import { Router } from "express";
import { referralController } from "../controllers/referral.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { referralCodeParam } from "../rules/requests/referral.request";
import { paginationQuery } from "../utils/pagination";

export const referralRouter = Router();
referralRouter.get("/me", authenticate, validate(paginationQuery, "query"), referralController.me);

// Không cần đăng nhập: trang đăng ký kiểm tra mã trên liên kết
export const referralPublicRouter = Router();
referralPublicRouter.get("/:code", validate(referralCodeParam, "params"), referralController.publicInfo);

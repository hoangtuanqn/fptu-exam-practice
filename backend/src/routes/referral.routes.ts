import { Router } from "express";
import { referralController } from "../controllers/referral.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { claimReferralBody, referralCodeParam } from "../rules/requests/referral.request";
import { paginationQuery } from "../utils/pagination";

export const referralRouter = Router();
referralRouter.get("/me", authenticate, validate(paginationQuery, "query"), referralController.me);
referralRouter.post("/claim", authenticate, validate(claimReferralBody), referralController.claim);

// Không cần đăng nhập: trang đăng ký kiểm tra mã trên liên kết
export const referralPublicRouter = Router();
referralPublicRouter.get("/:code", validate(referralCodeParam, "params"), referralController.publicInfo);

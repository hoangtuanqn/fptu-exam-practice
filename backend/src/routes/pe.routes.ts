import { Router } from "express";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { peController } from "../controllers/pe.controllers";
import { authenticate, requireVerifiedMember } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { isProUser } from "../utils/pro";
import { peDownloadBody } from "../rules/requests/pe.request";

const limiter = makeLimiter({ windowMs: 60 * 60 * 1000, limit: 20, skip: (req) => isProUser(req.user), message: "Bạn tải quá nhiều lần, vui lòng thử lại sau" });

const peRouter = Router();
peRouter.get("/price", peController.price);
peRouter.use(authenticate);
peRouter.get("/history", peController.history);
peRouter.get("/quote", peController.quote);
peRouter.post("/download", requireVerifiedMember, limiter, validate(peDownloadBody), peController.download);

export default peRouter;

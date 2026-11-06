import { Router } from "express";
import rateLimit from "express-rate-limit";
import { peController } from "../controllers/pe.controllers";
import { authenticate, requireVerifiedMember } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { peDownloadBody } from "../rules/requests/pe.request";

const limiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { status: false, message: "Bạn tải quá nhiều lần, vui lòng thử lại sau" } });

const peRouter = Router();
peRouter.get("/price", peController.price);
peRouter.use(authenticate);
peRouter.get("/history", peController.history);
peRouter.post("/download", requireVerifiedMember, limiter, validate(peDownloadBody), peController.download);

export default peRouter;

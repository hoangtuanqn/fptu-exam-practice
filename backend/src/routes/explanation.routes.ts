import { Router } from "express";
import rateLimit from "express-rate-limit";
import { explanationController } from "../controllers/explanation.controllers";
import { authenticate, requireVerifiedMember } from "../middlewares/auth.middlewares";
import { idempotent } from "../middlewares/idempotency.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { askBody } from "../rules/requests/ask.request";
import { examIdParam, explainBody, unlockBody } from "../rules/requests/explanation.request";

// Chặn dồn dập (ngoài số lượt mỗi ngày trong service)
const askLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { status: false, message: "Bạn hỏi quá nhanh, vui lòng chờ giây lát" } });

const explanationRouter = Router();

explanationRouter.use(authenticate);

explanationRouter.get("/exams/:examId", validate(examIdParam, "params"), explanationController.info);
explanationRouter.post("/", requireVerifiedMember, validate(explainBody), explanationController.explain);
explanationRouter.get("/ask/quota", explanationController.askQuota);
explanationRouter.post("/ask", requireVerifiedMember, askLimiter, validate(askBody), explanationController.ask);
explanationRouter.post("/unlock", requireVerifiedMember, idempotent, validate(unlockBody), explanationController.unlock);

export default explanationRouter;

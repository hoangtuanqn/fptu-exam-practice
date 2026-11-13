import { Router } from "express";
import { explanationController } from "../controllers/explanation.controllers";
import { authenticate, requireVerifiedMember } from "../middlewares/auth.middlewares";
import { CHAT_PER_MINUTE } from "../constants/ai";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { idempotent } from "../middlewares/idempotency.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { examIdParam, explainBody, explainChatBody, explainFeedbackBody, unlockBody } from "../rules/requests/explanation.request";

const explanationRouter = Router();

// Hỏi AI theo tài khoản: chống bấm liên tục (hạn mức theo ngày nằm ở service)
const chatLimiter = makeLimiter({
  limit: CHAT_PER_MINUTE,
  keyGenerator: (req) => `user:${req.user?.id ?? "anon"}`,
  validate: { keyGeneratorIpFallback: false },
  message: "Bạn hỏi quá nhanh, vui lòng chờ giây lát",
});

explanationRouter.use(authenticate);

explanationRouter.get("/exams/:examId", validate(examIdParam, "params"), explanationController.info);
explanationRouter.post("/", requireVerifiedMember, validate(explainBody), explanationController.explain);
explanationRouter.get("/chat/quota", explanationController.chatQuota);
explanationRouter.post("/chat", requireVerifiedMember, chatLimiter, validate(explainChatBody), explanationController.chat);
// Đánh giá lời giải: ghi đè được, mỗi người một đánh giá cho mỗi câu
explanationRouter.post("/feedback", requireVerifiedMember, validate(explainFeedbackBody), explanationController.feedback);
explanationRouter.post("/unlock", requireVerifiedMember, idempotent, validate(unlockBody), explanationController.unlock);

export default explanationRouter;

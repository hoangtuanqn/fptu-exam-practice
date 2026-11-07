import { Router } from "express";
import { explanationController } from "../controllers/explanation.controllers";
import { authenticate, requireVerifiedMember } from "../middlewares/auth.middlewares";
import { idempotent } from "../middlewares/idempotency.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { examIdParam, explainBody, unlockBody } from "../rules/requests/explanation.request";

const explanationRouter = Router();

explanationRouter.use(authenticate);

explanationRouter.get("/exams/:examId", validate(examIdParam, "params"), explanationController.info);
explanationRouter.post("/", requireVerifiedMember, validate(explainBody), explanationController.explain);
explanationRouter.post("/unlock", requireVerifiedMember, idempotent, validate(unlockBody), explanationController.unlock);

export default explanationRouter;

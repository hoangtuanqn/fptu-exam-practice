import { Router } from "express";
import { explanationController } from "../controllers/explanation.controllers";
import { authenticate, requireVerifiedMember } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { examIdParam, explainBody } from "../rules/requests/explanation.request";

const explanationRouter = Router();

explanationRouter.use(authenticate);

explanationRouter.get("/exams/:examId", validate(examIdParam, "params"), explanationController.info);
explanationRouter.post("/", requireVerifiedMember, validate(explainBody), explanationController.explain);

export default explanationRouter;

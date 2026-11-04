import { Router } from "express";
import { attemptController } from "../controllers/attempt.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { idParam } from "../rules/requests/admin.request";
import { attemptSummaryQuery, listAttemptsQuery } from "../rules/requests/attempt.request";

const attemptRouter = Router();

attemptRouter.use(authenticate);

attemptRouter.get("/", validate(listAttemptsQuery, "query"), attemptController.list);
attemptRouter.get("/summary", validate(attemptSummaryQuery, "query"), attemptController.summary);
attemptRouter.get("/:id", validate(idParam, "params"), attemptController.get);

export default attemptRouter;

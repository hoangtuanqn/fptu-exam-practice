import { Router } from "express";
import { examController } from "../controllers/exam.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { idParam } from "../rules/requests/admin.request";
import { submitAttemptBody } from "../rules/requests/attempt.request";
import { paginationQuery } from "../utils/pagination";

const examRouter = Router();

examRouter.use(authenticate);

examRouter.get("/", validate(paginationQuery, "query"), examController.listMine);
examRouter.get("/:id", validate(idParam, "params"), examController.get);
examRouter.post("/:id/attempts", validate(idParam, "params"), validate(submitAttemptBody), examController.submitAttempt);

export default examRouter;

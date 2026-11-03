import { Router } from "express";
import { answerReportController } from "../controllers/answer-report.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { createReportBody } from "../rules/requests/answer-report.request";
import { paginationQuery } from "../utils/pagination";

const answerReportRouter = Router();

answerReportRouter.use(authenticate);

answerReportRouter.post("/", validate(createReportBody), answerReportController.create);
answerReportRouter.get("/mine", validate(paginationQuery, "query"), answerReportController.mine);

export default answerReportRouter;

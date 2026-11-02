import { Router } from "express";
import { examController } from "../controllers/exam.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { idParam } from "../rules/requests/admin.request";

const examRouter = Router();

examRouter.use(authenticate);

examRouter.get("/:id", validate(idParam, "params"), examController.get);

export default examRouter;

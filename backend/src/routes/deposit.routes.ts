import { Router } from "express";
import { depositController } from "../controllers/deposit.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { idParam } from "../rules/requests/admin.request";
import { createDepositBody, listDepositsQuery } from "../rules/requests/deposit.request";

const depositRouter = Router();

depositRouter.use(authenticate);

depositRouter.get("/info", depositController.info);
depositRouter.get("/", validate(listDepositsQuery, "query"), depositController.list);
depositRouter.post("/", validate(createDepositBody), depositController.create);
depositRouter.get("/:id", validate(idParam, "params"), depositController.get);

export default depositRouter;

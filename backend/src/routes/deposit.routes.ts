import { Router } from "express";
import { depositController } from "../controllers/deposit.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { idempotent } from "../middlewares/idempotency.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { createDepositBody, depositCodeParam, listDepositsQuery } from "../rules/requests/deposit.request";

const depositRouter = Router();

depositRouter.use(authenticate);

depositRouter.get("/info", depositController.info);
depositRouter.get("/", validate(listDepositsQuery, "query"), depositController.list);
depositRouter.post("/", idempotent, validate(createDepositBody), depositController.create);
depositRouter.get("/:code", validate(depositCodeParam, "params"), depositController.get);

export default depositRouter;

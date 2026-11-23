import { Router } from "express";
import { peController } from "../controllers/pe.controllers";
import { authenticate } from "../middlewares/auth.middlewares";

const peRouter = Router();
peRouter.get("/price", peController.price);
peRouter.use(authenticate);
peRouter.get("/history", peController.history);

export default peRouter;

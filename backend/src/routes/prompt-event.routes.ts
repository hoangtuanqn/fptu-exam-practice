import { Router } from "express";
import { authenticate } from "../middlewares/auth.middlewares";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { promptEventController } from "../controllers/prompt-event.controllers";
import { promptEventBody } from "../rules/requests/prompt-event.request";

const promptEventRouter = Router();

// Frontend reports when an upgrade or top-up prompt is shown, clicked or dismissed
promptEventRouter.post("/prompt", authenticate, makeLimiter({ limit: 60 }), validate(promptEventBody, "body"), promptEventController.record);

export default promptEventRouter;

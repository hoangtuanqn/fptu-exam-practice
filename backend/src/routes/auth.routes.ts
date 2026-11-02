import { Router } from "express";
import { authController } from "../controllers/auth.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { authLimiter } from "../middlewares/rateLimit.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { loginBody, registerBody } from "../rules/requests/auth.request";

const authRouter = Router();

authRouter.post("/register", authLimiter, validate(registerBody), authController.register);
authRouter.post("/login", authLimiter, validate(loginBody), authController.login);
authRouter.get("/me", authenticate, authController.me);

export default authRouter;

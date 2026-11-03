import { Router } from "express";
import { authController } from "../controllers/auth.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { authLimiter, forgotPasswordLimiter } from "../middlewares/rateLimit.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { forgotPasswordBody, loginBody, registerBody, resetPasswordBody } from "../rules/requests/auth.request";

const authRouter = Router();

authRouter.post("/register", authLimiter, validate(registerBody), authController.register);
authRouter.post("/login", authLimiter, validate(loginBody), authController.login);
authRouter.post("/forgot-password", forgotPasswordLimiter, validate(forgotPasswordBody), authController.forgotPassword);
authRouter.post("/reset-password", authLimiter, validate(resetPasswordBody), authController.resetPassword);
authRouter.get("/me", authenticate, authController.me);

export default authRouter;

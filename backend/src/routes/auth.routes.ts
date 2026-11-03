import { Router } from "express";
import { authController } from "../controllers/auth.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { authLimiter, forgotPasswordLimiter } from "../middlewares/rateLimit.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { forgotPasswordBody, loginBody, registerBody, resetPasswordBody, verifyEmailBody } from "../rules/requests/auth.request";

const authRouter = Router();

authRouter.post("/register", authLimiter, validate(registerBody), authController.register);
authRouter.post("/login", authLimiter, validate(loginBody), authController.login);
authRouter.post("/forgot-password", forgotPasswordLimiter, validate(forgotPasswordBody), authController.forgotPassword);
authRouter.post("/reset-password", authLimiter, validate(resetPasswordBody), authController.resetPassword);
authRouter.post("/verify-email", authLimiter, validate(verifyEmailBody), authController.verifyEmail);
authRouter.post("/resend-verification", authenticate, authController.resendVerification);
authRouter.get("/me", authenticate, authController.me);

export default authRouter;

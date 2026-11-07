import { Router } from "express";
import { authController } from "../controllers/auth.controllers";
import { authenticate } from "../middlewares/auth.middlewares";
import { authLimiter, forgotPasswordLimiter, refreshLimiter } from "../middlewares/rateLimit.middlewares";
import { validate } from "../middlewares/validate.middlewares";
import { forgotPasswordBody, githubLoginBody, googleLoginBody, loginBody, registerBody, resetPasswordBody, verifyEmailBody } from "../rules/requests/auth.request";

const authRouter = Router();

authRouter.post("/register", authLimiter, validate(registerBody), authController.register);
authRouter.post("/login", authLimiter, validate(loginBody), authController.login);
authRouter.post("/forgot-password", forgotPasswordLimiter, validate(forgotPasswordBody), authController.forgotPassword);
authRouter.post("/reset-password", authLimiter, validate(resetPasswordBody), authController.resetPassword);
// Phiên đăng nhập dài hạn (cookie httpOnly): đổi lấy access token mới, và đăng xuất để thu hồi
authRouter.post("/refresh", refreshLimiter, authController.refresh);
authRouter.post("/logout", refreshLimiter, authController.logout);
authRouter.get("/google/config", authController.googleConfig);
authRouter.get("/signup-bonus", authController.signupBonus);
authRouter.post("/google", authLimiter, validate(googleLoginBody), authController.google);
authRouter.get("/github/config", authController.githubConfig);
authRouter.post("/github", authLimiter, validate(githubLoginBody), authController.github);
authRouter.post("/verify-email", authLimiter, validate(verifyEmailBody), authController.verifyEmail);
authRouter.post("/resend-verification", authenticate, authController.resendVerification);
authRouter.get("/me", authenticate, authController.me);

export default authRouter;

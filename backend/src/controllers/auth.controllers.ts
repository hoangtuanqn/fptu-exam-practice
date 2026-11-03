import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import { authService } from "../services/auth.service";
import { googleAuthService } from "../services/google-auth.service";
import { emailVerificationService } from "../services/email-verification.service";
import { HTTP_STATUS } from "../constants/httpStatus";
import type { ForgotPasswordBody, GoogleLoginBody, LoginBody, RegisterBody, ResetPasswordBody, VerifyEmailBody } from "../rules/requests/auth.request";
import { ResponseClient } from "../rules/response";

export const authController = {
  async register(_req: Request, res: Response) {
    const data = await authService.register(getValidated<RegisterBody>(res));
    res.status(HTTP_STATUS.CREATED).json(new ResponseClient({ message: "Đăng ký thành công", data }));
  },

  async login(_req: Request, res: Response) {
    const data = await authService.login(getValidated<LoginBody>(res));
    res.json(new ResponseClient({ message: "Đăng nhập thành công", data }));
  },

  async forgotPassword(_req: Request, res: Response) {
    await authService.forgotPassword(getValidated<ForgotPasswordBody>(res));
    // Thông báo chung, không cho biết email có tồn tại hay không
    res.json(new ResponseClient({ message: "Nếu email đã đăng ký, chúng mình vừa gửi hướng dẫn đặt lại mật khẩu. Hãy kiểm tra hộp thư (cả mục Spam)." }));
  },

  async resetPassword(_req: Request, res: Response) {
    await authService.resetPassword(getValidated<ResetPasswordBody>(res));
    res.json(new ResponseClient({ message: "Đã đặt lại mật khẩu, bạn có thể đăng nhập bằng mật khẩu mới" }));
  },

  // Công khai: client ID để giao diện nạp thư viện Google (null = chưa cấu hình, ẩn nút)
  googleConfig(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: googleAuthService.config() }));
  },

  async google(_req: Request, res: Response) {
    const { accessToken, referralCode } = getValidated<GoogleLoginBody>(res);
    const { created, ...data } = await googleAuthService.login(accessToken, referralCode);
    res.status(created ? HTTP_STATUS.CREATED : HTTP_STATUS.OK).json(new ResponseClient({ message: created ? "Đăng ký thành công" : "Đăng nhập thành công", data }));
  },

  // Không cần đăng nhập: người dùng có thể mở liên kết từ điện thoại hoặc trình duyệt khác
  async verifyEmail(_req: Request, res: Response) {
    const { token } = getValidated<VerifyEmailBody>(res);
    res.json(new ResponseClient({ message: "Đã xác minh email", data: await emailVerificationService.verify(token) }));
  },

  async resendVerification(req: Request, res: Response) {
    await emailVerificationService.resend(req.user!.id);
    res.json(new ResponseClient({ message: "Đã gửi lại thư xác minh, hãy kiểm tra hộp thư (cả mục Spam)" }));
  },

  me(req: Request, res: Response) {
    res.json(new ResponseClient({ data: req.user }));
  },
};

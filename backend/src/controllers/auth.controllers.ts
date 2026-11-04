import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import { authService } from "../services/auth.service";
import { accountSettingService } from "../services/account-setting.service";
import { googleAuthService } from "../services/google-auth.service";
import { refreshTokenService, type ClientContext } from "../services/refresh-token.service";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import { signToken } from "../utils/jwt";
import { clearRefreshCookie, isTrustedOrigin, readRefreshCookie, setRefreshCookie } from "../utils/auth-cookie";
import { emailVerificationService } from "../services/email-verification.service";
import { HTTP_STATUS } from "../constants/httpStatus";
import type { ForgotPasswordBody, GoogleLoginBody, LoginBody, RegisterBody, ResetPasswordBody, VerifyEmailBody } from "../rules/requests/auth.request";
import { ResponseClient } from "../rules/response";

const clientContext = (req: Request): ClientContext => ({ ip: req.ip, userAgent: req.get("user-agent") });

// Đăng nhập/đăng ký xong thì mở phiên dài hạn: refresh token nằm trong cookie httpOnly, không đưa cho JavaScript
const startSession = async (req: Request, res: Response, user: { id: number } | null) => {
  if (!user) return;
  setRefreshCookie(res, (await refreshTokenService.issue(user.id, clientContext(req))).token);
};

export const authController = {
  async register(req: Request, res: Response) {
    const data = await authService.register(getValidated<RegisterBody>(res));
    await startSession(req, res, data.user);
    res.status(HTTP_STATUS.CREATED).json(new ResponseClient({ message: "Đăng ký thành công", data }));
  },

  async login(req: Request, res: Response) {
    const data = await authService.login(getValidated<LoginBody>(res));
    await startSession(req, res, data.user);
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

  async google(req: Request, res: Response) {
    const { accessToken, referralCode } = getValidated<GoogleLoginBody>(res);
    const { created, ...data } = await googleAuthService.login(accessToken, referralCode);
    await startSession(req, res, data.user);
    res.status(created ? HTTP_STATUS.CREATED : HTTP_STATUS.OK).json(new ResponseClient({ message: created ? "Đăng ký thành công" : "Đăng nhập thành công", data }));
  },

  // Công khai: credit tặng khi đăng ký, để trang chủ báo cho khách (0 = không tặng, giao diện ẩn dòng này)
  async signupBonus(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: { credit: (await accountSettingService.get()).signupCredit } }));
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

  // Access token hết hạn: đổi refresh token (cookie) lấy access token mới và xoay vòng refresh token
  async refresh(req: Request, res: Response) {
    const raw = readRefreshCookie(req);
    if (!raw || !isTrustedOrigin(req)) throw AppError.unauthorized();
    try {
      const { userId, refreshToken } = await refreshTokenService.rotate(raw, clientContext(req));
      const user = await userRepository.findById(userId);
      if (!user || user.status === "BANNED") {
        await refreshTokenService.revokeAllOfUser(userId);
        throw AppError.unauthorized();
      }
      if (refreshToken) setRefreshCookie(res, refreshToken);
      res.json(new ResponseClient({ data: { token: signToken(user.id), user } }));
    } catch (err) {
      clearRefreshCookie(res); // phiên không còn hợp lệ: bỏ cookie để trình duyệt thôi gửi
      throw err;
    }
  },

  async logout(req: Request, res: Response) {
    const raw = readRefreshCookie(req);
    if (raw && isTrustedOrigin(req)) await refreshTokenService.logout(raw);
    clearRefreshCookie(res);
    res.json(new ResponseClient({ message: "Đã đăng xuất" }));
  },

  me(req: Request, res: Response) {
    res.json(new ResponseClient({ data: req.user }));
  },
};

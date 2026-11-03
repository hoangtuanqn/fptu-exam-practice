import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import { authService } from "../services/auth.service";
import { HTTP_STATUS } from "../constants/httpStatus";
import type { ForgotPasswordBody, LoginBody, RegisterBody, ResetPasswordBody } from "../rules/requests/auth.request";
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

  me(req: Request, res: Response) {
    res.json(new ResponseClient({ data: req.user }));
  },
};

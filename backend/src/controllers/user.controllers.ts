import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { ChangeEmailBody, ChangePasswordBody, UpdateProfileBody } from "../rules/requests/user.request";
import { ResponseClient } from "../rules/response";
import { emailVerificationService } from "../services/email-verification.service";
import { userService } from "../services/user.service";
import { walletService } from "../services/wallet.service";
import type { PaginationQuery } from "../utils/pagination";

// Bảng điều khiển người dùng: chỉ thao tác trên chính tài khoản đang đăng nhập (req.user)
export const userController = {
  profile(req: Request, res: Response) {
    res.json(new ResponseClient({ data: req.user }));
  },

  async updateProfile(req: Request, res: Response) {
    const data = await userService.updateProfile(req.user!.id, getValidated<UpdateProfileBody>(res));
    res.json(new ResponseClient({ message: "Đã cập nhật thông tin", data }));
  },

  async changePassword(req: Request, res: Response) {
    await userService.changePassword(req.user!.id, getValidated<ChangePasswordBody>(res));
    res.json(new ResponseClient({ message: "Đã đổi mật khẩu" }));
  },

  // Đổi email: gửi thư xác minh tới địa chỉ mới, email chỉ đổi khi người dùng bấm liên kết
  async changeEmail(req: Request, res: Response) {
    await emailVerificationService.requestChange(req.user!.id, getValidated<ChangeEmailBody>(res));
    res.json(new ResponseClient({ message: "Đã gửi thư xác minh tới email mới. Bấm liên kết trong thư để hoàn tất đổi email." }));
  },

  async transactions(req: Request, res: Response) {
    const { items, meta } = await walletService.history(req.user!.id, getValidated<PaginationQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },
};

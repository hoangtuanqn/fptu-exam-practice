import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { ChangePasswordBody, UpdateProfileBody } from "../rules/requests/user.request";
import { ResponseClient } from "../rules/response";
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

  async transactions(req: Request, res: Response) {
    const { items, meta } = await walletService.history(req.user!.id, getValidated<PaginationQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },
};

import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import type { AdjustBalanceBody, IdParam, ListUsersQuery, ResetPasswordByAdminBody, UpdateUserBody } from "../rules/requests/admin.request";
import { ResponseClient } from "../rules/response";
import { adminUserService } from "../services/admin.user.service";

const idOf = (res: Response) => getValidated<IdParam>(res, "params").id;

export const adminUserController = {
  async list(_req: Request, res: Response) {
    const { items, meta } = await adminUserService.list(getValidated<ListUsersQuery>(res, "query"));
    res.json(new ResponseClient({ data: items, meta }));
  },

  async get(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await adminUserService.get(idOf(res)) }));
  },

  async update(req: Request, res: Response) {
    const data = await adminUserService.update(req.user!, idOf(res), getValidated<UpdateUserBody>(res));
    res.json(new ResponseClient({ message: "Đã cập nhật thành viên", data }));
  },

  async adjustBalance(_req: Request, res: Response) {
    const data = await adminUserService.adjustBalance(idOf(res), getValidated<AdjustBalanceBody>(res));
    res.json(new ResponseClient({ message: "Đã điều chỉnh số dư", data }));
  },

  async summary(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await adminUserService.summary(idOf(res)) }));
  },

  async resetPassword(req: Request, res: Response) {
    const data = await adminUserService.resetPassword(req.user!, idOf(res), getValidated<ResetPasswordByAdminBody>(res));
    res.json(new ResponseClient({ message: "Đã đặt lại mật khẩu", data }));
  },

  async sendResetLink(_req: Request, res: Response) {
    await adminUserService.sendResetLink(idOf(res));
    res.json(new ResponseClient({ message: "Đã gửi thư đặt lại mật khẩu cho thành viên" }));
  },

  async revokeSessions(req: Request, res: Response) {
    await adminUserService.revokeSessions(req.user!, idOf(res));
    res.json(new ResponseClient({ message: "Đã đăng xuất thành viên khỏi mọi thiết bị" }));
  },

  async impersonate(req: Request, res: Response) {
    res.json(new ResponseClient({ message: "Đang đăng nhập với tư cách thành viên", data: await adminUserService.impersonate(req.user!, idOf(res)) }));
  },
};

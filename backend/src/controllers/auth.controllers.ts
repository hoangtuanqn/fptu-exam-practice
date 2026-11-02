import type { Request, Response } from "express";
import { getValidated } from "../middlewares/validate.middlewares";
import { authService } from "../services/auth.service";
import { HTTP_STATUS } from "../constants/httpStatus";
import type { LoginBody, RegisterBody } from "../rules/requests/auth.request";
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

  me(req: Request, res: Response) {
    res.json(new ResponseClient({ data: req.user }));
  },
};

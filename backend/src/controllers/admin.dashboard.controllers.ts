import type { Request, Response } from "express";
import { ResponseClient } from "../rules/response";
import { presence } from "../realtime/presence";
import { userRepository } from "../repositories/user.repository";
import { adminDashboardService } from "../services/admin.dashboard.service";

export const adminDashboardController = {
  async overview(_req: Request, res: Response) {
    res.json(new ResponseClient({ data: await adminDashboardService.overview() }));
  },

  // Ai đang online và đang ở trang nào (đọc từ RAM, chỉ tra DB lấy tên)
  async presence(_req: Request, res: Response) {
    const { guests, members } = presence.snapshot();
    const names = new Map((await userRepository.findNames(members.map((m) => m.userId))).map((u) => [u.id, u]));
    const users = members.map((m) => ({ ...m, fullName: names.get(m.userId)?.fullName ?? "", email: names.get(m.userId)?.email ?? "" }));
    res.json(new ResponseClient({ data: { guests, users } }));
  },
};

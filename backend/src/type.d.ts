import type { PublicUser } from "./repositories/user.repository";

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
      impersonated?: boolean; // quản trị viên đang đăng nhập thay thành viên này
      guestId?: string; // ID khách từ header X-Guest-Id (có cả khi đã đăng nhập, để nhận đề của khách về tài khoản)
    }
  }
}

export {};

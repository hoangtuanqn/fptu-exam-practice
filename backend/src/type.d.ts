import type { PublicUser } from "./repositories/user.repository";

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser;
      guestId?: string; // ID khách từ header X-Guest-Id (có cả khi đã đăng nhập, để nhận đề của khách về tài khoản)
    }
  }
}

export {};

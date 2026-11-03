import type { Request } from "express";

// Chủ của một đề/job: thành viên (userId) hoặc khách chưa đăng nhập (guestId do trình duyệt tự sinh)
export type Owner = { userId: number } | { guestId: string };

export interface Actor {
  owner: Owner;
  isAdmin: boolean;
}

// Đã đăng nhập thì ưu tiên tài khoản; chỉ dùng sau middleware identify/authenticate
export const actorOf = (req: Request): Actor => ({
  owner: req.user ? { userId: req.user.id } : { guestId: req.guestId! },
  isAdmin: req.user?.role === "ADMIN",
});

export const isMember = (owner: Owner): owner is { userId: number } => "userId" in owner;

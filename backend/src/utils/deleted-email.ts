import { createHmac } from "node:crypto";
import { env } from "../configs/env";

// Băm có khoá của email đã xoá: không dò ngược được khi chỉ lộ DB.
// shortcut: khoá lấy từ JWT_SECRET; đổi secret thì hash cũ hết khớp (người đã xoá nhận lại quà đăng ký), cần thì tách khoá riêng.
export const hashDeletedEmail = (email: string) => createHmac("sha256", env.JWT_SECRET).update(`deleted-email:${email.trim().toLowerCase()}`).digest("hex");

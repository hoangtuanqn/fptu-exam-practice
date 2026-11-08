import { Router } from "express";
import { makeLimiter } from "../middlewares/rateLimit.middlewares";
import { reminderService } from "../services/reminder.service";

// Liên kết "Hủy nhận thư nhắc ôn" trong email: không cần đăng nhập, xác thực bằng chữ ký riêng của từng người
const reminderPublicRouter = Router();
const limiter = makeLimiter({ limit: 20 });

const page = (title: string, body: string) =>
  `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head><body style="font-family:sans-serif;max-width:420px;margin:15vh auto;padding:0 20px;text-align:center;color:#333"><h1 style="font-size:20px">${title}</h1><p>${body}</p></body></html>`;

reminderPublicRouter.get("/unsubscribe", limiter, async (req, res) => {
  const userId = Number(req.query.u);
  const token = typeof req.query.t === "string" ? req.query.t : "";
  const ok = Number.isInteger(userId) && userId > 0 && (await reminderService.unsubscribe(userId, token));
  res
    .status(ok ? 200 : 400)
    .type("html")
    .send(ok ? page("Đã hủy nhắc ôn", "Bạn sẽ không nhận email nhắc ôn nữa. Muốn bật lại, vào Hồ sơ trong tài khoản.") : page("Liên kết không hợp lệ", "Liên kết hủy đã hết hiệu lực hoặc không đúng."));
});

export default reminderPublicRouter;

import crypto from "node:crypto";

// Token trong thư marketing: "<id>.<HMAC>" ký bằng secret có sẵn của server, không hết hạn (liên kết trong thư cũ vẫn dùng được).
// Mỗi mục đích có chuỗi riêng nên token huỷ nhận thư không dùng làm token bấm nút được và ngược lại.
const UNSUBSCRIBE = "marketing-unsubscribe:";
const mac = (secret: string, purpose: string, id: number) => crypto.createHmac("sha256", secret).update(`${purpose}${id}`).digest("hex").slice(0, 32);

export const MARKETING_TOKEN_RE = /^\d{1,10}\.[a-f0-9]{32}$/;

export const signToken = (purpose: string, secret: string, id: number) => `${id}.${mac(secret, purpose, id)}`;

/** id nếu token đúng chữ ký cho mục đích này, ngược lại null. */
export const verifyToken = (purpose: string, secret: string, token: string): number | null => {
  if (!MARKETING_TOKEN_RE.test(token)) return null;
  const [raw = "", sig = ""] = token.split(".");
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return crypto.timingSafeEqual(Buffer.from(mac(secret, purpose, id)), Buffer.from(sig)) ? id : null;
};

export const signMarketingToken = (secret: string, userId: number) => signToken(UNSUBSCRIBE, secret, userId);
export const verifyMarketingToken = (secret: string, token: string) => verifyToken(UNSUBSCRIBE, secret, token);

// Step lưu trong email_campaign_logs: chiến dịch lặp lại = cycle * factor + bước; số ngày UTC từ 1970 dùng làm cycle
export const epochDay = (d: Date) => Math.floor(d.getTime() / 86_400_000);

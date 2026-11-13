import crypto from "node:crypto";

// Token hủy nhận thư marketing: "<userId>.<HMAC>" ký bằng secret có sẵn của server, không hết hạn (liên kết trong thư cũ vẫn dùng được)
const PURPOSE = "marketing-unsubscribe:";
const mac = (secret: string, userId: number) => crypto.createHmac("sha256", secret).update(`${PURPOSE}${userId}`).digest("hex").slice(0, 32);

export const MARKETING_TOKEN_RE = /^\d{1,10}\.[a-f0-9]{32}$/;

export const signMarketingToken = (secret: string, userId: number) => `${userId}.${mac(secret, userId)}`;

/** userId nếu token đúng chữ ký, ngược lại null. */
export const verifyMarketingToken = (secret: string, token: string): number | null => {
  if (!MARKETING_TOKEN_RE.test(token)) return null;
  const [id = "", sig = ""] = token.split(".");
  const userId = Number(id);
  if (!Number.isSafeInteger(userId) || userId <= 0) return null;
  const expected = Buffer.from(mac(secret, userId));
  return crypto.timingSafeEqual(expected, Buffer.from(sig)) ? userId : null;
};

// Step lưu trong email_campaign_logs: chiến dịch lặp lại = cycle * factor + bước; số ngày UTC từ 1970 dùng làm cycle
export const epochDay = (d: Date) => Math.floor(d.getTime() / 86_400_000);

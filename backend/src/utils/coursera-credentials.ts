import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { AppError } from "../rules/error";

// A separate key prevents JWT/password changes from making stored credentials unreadable.
function key() {
  const value = process.env.COURSERA_ENCRYPTION_KEY ?? "";
  if (!/^[a-f\d]{64}$/i.test(value)) throw new AppError("Dịch vụ Coursera chưa sẵn sàng, vui lòng thử lại sau", 503);
  return Buffer.from(value, "hex");
}

export function encryptCourseraPassword(password: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptCourseraPassword(value: string) {
  try {
    const [version, iv, tag, encrypted] = value.split(".");
    if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Invalid envelope");
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64")), decipher.final()]).toString("utf8");
  } catch {
    throw new AppError("Không thể đọc thông tin đăng nhập của đơn này", 503);
  }
}

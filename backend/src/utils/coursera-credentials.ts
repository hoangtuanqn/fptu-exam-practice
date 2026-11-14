import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { AppError } from "../rules/error";

// Orders now store the Coursera password as plaintext (owner decision, ADR 0005). This module only reads
// legacy rows written as "v1." AES-256-GCM envelopes; the key is needed only while such rows exist.
function key() {
  const value = process.env.COURSERA_ENCRYPTION_KEY ?? "";
  if (!/^[a-f\d]{64}$/i.test(value)) throw new AppError("Dịch vụ Coursera chưa sẵn sàng, vui lòng thử lại sau", 503);
  return Buffer.from(value, "hex");
}

// Exact envelope shape (12-byte IV, 16-byte tag, base64) so a plaintext password starting with "v1." is not mistaken for one.
const LEGACY_ENVELOPE = /^v1\.[A-Za-z0-9+/]{16}\.[A-Za-z0-9+/]{22}==\.[A-Za-z0-9+/]+={0,2}$/;

/** Legacy writer, kept so tests can build "v1." rows. New orders must not call it. */
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

/** Stored value to the password shown to an admin: legacy envelopes are decrypted, plaintext is returned as is. */
export const readCourseraPassword = (stored: string) => (LEGACY_ENVELOPE.test(stored) ? decryptCourseraPassword(stored) : stored);

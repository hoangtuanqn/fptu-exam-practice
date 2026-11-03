import "dotenv/config";
import path from "node:path";
import { z } from "zod";

// Kiểm tra biến môi trường ngay khi khởi động để lỗi cấu hình lộ ra sớm
const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8000),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET cần ít nhất 32 ký tự"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  // Gửi email (quên mật khẩu). Không cấu hình thì server vẫn chạy, chỉ không gửi được thư
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(), // ví dụ: "MST Software <no-reply@domain.com>", mặc định dùng SMTP_USER
  PASSWORD_RESET_EXPIRES_MIN: z.coerce.number().default(30),
  // Gemini: khóa mặc định khi admin chưa nhập trong trang quản trị; AI_PROMPT_FILE đổi file prompt hệ thống
  GEMINI_API_KEY: z.string().optional(),
  AI_PROMPT_FILE: z.string().optional(),
  STORAGE_DIR: z.string().default("storage"), // nơi lưu ảnh đề đã crawl
  ADMIN_EMAIL: z.string().default("admin@example.com"),
  ADMIN_PASSWORD: z.string().default("Admin@123456"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Biến môi trường không hợp lệ:");
  for (const issue of parsed.error.issues) console.error(` - ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

// Thư mục lưu ảnh, tính từ nơi chạy server
export const storageDir = path.resolve(env.STORAGE_DIR);

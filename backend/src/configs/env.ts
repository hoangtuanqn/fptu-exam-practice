import "dotenv/config";
import { z } from "zod";

// Kiểm tra biến môi trường ngay khi khởi động để lỗi cấu hình lộ ra sớm
const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8000),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET cần ít nhất 32 ký tự"),
  JWT_EXPIRES_IN: z.string().default("7d"),
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

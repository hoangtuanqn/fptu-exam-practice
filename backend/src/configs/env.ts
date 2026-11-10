import "dotenv/config";
import path from "node:path";
import { z } from "zod";

// Kiểm tra biến môi trường ngay khi khởi động để lỗi cấu hình lộ ra sớm
const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(8000),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  // Địa chỉ công khai của API khi web ở domain khác (vd https://api.fepass.top). Để trống khi dev: ảnh dùng đường dẫn tương đối
  API_URL: z
    .string()
    .default("")
    .transform((v) => v.replace(/\/+$/, "")),
  // Số lớp reverse proxy phía trước (Nginx = 1) để lấy đúng IP người dùng cho giới hạn tốc độ. Dev để 0
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET cần ít nhất 32 ký tự"),
  // Access token sống ngắn (có refresh token đổi lấy cái mới); lộ token cũng chỉ dùng được trong chừng này thời gian
  JWT_EXPIRES_IN: z.string().default("15m"),
  // Phiên đăng nhập (refresh token) sống chừng này ngày kể từ lần dùng gần nhất; không dùng quá lâu thì phải đăng nhập lại
  REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).default(30),
  // Gửi email (quên mật khẩu). Không cấu hình thì server vẫn chạy, chỉ không gửi được thư
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(), // ví dụ: "MST Software <no-reply@domain.com>", mặc định dùng SMTP_USER
  PASSWORD_RESET_EXPIRES_MIN: z.coerce.number().default(30),
  // Anthropic (Claude): khóa mặc định khi admin chưa nhập trong trang quản trị
  ANTHROPIC_API_KEY: z.string().optional(),
  // OpenAI: chỉ dùng tạo embedding (chatbot hỗ trợ và tìm kiếm syllabus); admin có thể nhập ở trang quản trị thay cho biến này
  OPENAI_API_KEY: z.string().optional(),
  // Đăng nhập Google: OAuth client ID (Google Cloud Console > APIs & Services > Credentials). Bỏ trống thì ẩn nút đăng nhập Google.
  GOOGLE_CLIENT_ID: z.string().optional(),
  // Đăng nhập GitHub: OAuth App (GitHub > Settings > Developer settings > OAuth Apps). Callback URL = <CLIENT_URL>/auth/github/callback.
  // Thiếu một trong hai thì ẩn nút đăng nhập GitHub.
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
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

import "dotenv/config";
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

// Cơ sở dữ liệu dùng một lần cho test: tạo fepass_test_<giây unix>_<ngẫu nhiên> trên cùng máy chủ MySQL của DATABASE_URL,
// chạy mọi migration bằng prisma migrate deploy, trỏ DATABASE_URL của tiến trình test sang đó, xong thì DROP.
// Chỉ tạo/xoá database có tên khớp đúng mẫu NAME: không đọc hay ghi bảng nào của database thật. Không in URL (có mật khẩu).

export const DB_TESTS_ENABLED = process.env.TEST_DB === "1";
export const DB_SKIP_REASON = "set TEST_DB=1 to run against a throwaway MySQL database";
const NAME = /^fepass_test_(\d{10})_[a-f0-9]{8}$/;
const STALE_MS = 60 * 60 * 1000; // database test bị bỏ lại (tiến trình bị giết) quá chừng này thì xoá khi chạy lần sau
const BACKEND_DIR = path.resolve(__dirname, "../..");

export interface ThrowawayDb {
  name: string;
  drop(): Promise<void>;
}

const sanitize = (s: string) => s.replace(/mysql:\/\/[^\s"']+/g, "mysql://***");
const createdAtMs = (name: string) => {
  const m = NAME.exec(name);
  return m ? Number(m[1]) * 1000 : null;
};

/** Xoá các database test cũ hơn STALE_MS (tên phải khớp đúng mẫu, thời điểm tạo lấy từ tên). */
async function dropStale(admin: PrismaClient) {
  const rows = await admin.$queryRaw<{ name: string }[]>`SELECT SCHEMA_NAME AS name FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'fepass\\_test\\_%'`;
  for (const { name } of rows) {
    const at = createdAtMs(name);
    if (at === null || Date.now() - at < STALE_MS) continue;
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${name}\``);
  }
}

export async function createThrowawayDb(): Promise<ThrowawayDb> {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("DATABASE_URL is not set (backend/.env)");
  const url = new URL(base);
  const name = `fepass_test_${Math.floor(Date.now() / 1000)}_${randomBytes(4).toString("hex")}`;
  if (!NAME.test(name) || url.pathname.slice(1) === name) throw new Error("Refusing to use this database name");
  url.pathname = `/${name}`;

  const admin = new PrismaClient({ datasourceUrl: base });
  await dropStale(admin);
  await admin.$executeRawUnsafe(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

  let dropped = false;
  const drop = async () => {
    if (dropped || !NAME.test(name)) return;
    dropped = true;
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${name}\``);
    await admin.$disconnect();
  };
  // Bị ngắt (Ctrl+C) hoặc thoát mà chưa xoá: cố xoá trước khi tắt (không được thì lần chạy sau xoá nhờ dropStale)
  const onSignal = (signal: NodeJS.Signals) => {
    drop()
      .catch(() => undefined)
      .finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  process.once("beforeExit", () => void drop().catch(() => undefined));

  try {
    execSync("npx prisma migrate deploy", { cwd: BACKEND_DIR, env: { ...process.env, DATABASE_URL: url.toString() }, stdio: "pipe" });
  } catch (err) {
    const e = err as { stdout?: Buffer; stderr?: Buffer };
    await drop();
    throw new Error(`prisma migrate deploy failed: ${sanitize(`${e.stdout?.toString() ?? ""}\n${e.stderr?.toString() ?? ""}`).slice(-2000)}`);
  }
  process.env.DATABASE_URL = url.toString(); // configs/prisma đọc biến này khi được import lần đầu (import động sau dòng này)
  return { name, drop };
}

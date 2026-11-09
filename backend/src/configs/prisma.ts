import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Một PrismaClient duy nhất cho cả app (giữ lại khi tsx watch reload)
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Số kết nối tối đa của app tới MySQL. Mặc định của Prisma phụ thuộc số CPU (máy nhỏ ra con số bất ngờ), nên đặt rõ.
// Nếu DATABASE_URL đã có connection_limit thì giữ nguyên.
const POOL_SIZE = Number(process.env.DB_POOL_SIZE) || 10;
const SLOW_QUERY_MS = Number(process.env.SLOW_QUERY_MS) || 300;

const withPool = (url: string | undefined) => (url && !/[?&]connection_limit=/.test(url) ? `${url}${url.includes("?") ? "&" : "?"}connection_limit=${POOL_SIZE}` : undefined);

function create() {
  const client = new PrismaClient({ datasourceUrl: withPool(process.env.DATABASE_URL), log: [{ emit: "event", level: "query" }] });
  // Ghi cảnh báo mọi truy vấn chậm (không in giá trị tham số, tránh lộ dữ liệu người dùng vào log)
  client.$on("query", (e) => {
    if (e.duration >= SLOW_QUERY_MS) console.warn(`[db] truy vấn chậm ${e.duration}ms: ${e.query.replace(/\s+/g, " ").slice(0, 300)}`);
  });
  return client;
}

export const prisma = globalForPrisma.prisma ?? create();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

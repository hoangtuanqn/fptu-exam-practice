import { ApiError } from "@/shared/api/client";

// Nhóm lỗi để giao diện chọn cách xử lý: thử lại, đăng nhập lại, chờ rồi thử lại...
export type ErrorKind = "network" | "rate-limit" | "session" | "server" | "client" | "unknown";

export function errorKind(err: unknown): ErrorKind {
  if (!(err instanceof ApiError)) return "unknown";
  if (err.status === 0) return "network";
  if (err.status === 429) return "rate-limit";
  if (err.status === 401) return "session";
  if (err.status >= 500) return "server";
  return "client";
}

// Lỗi tạm thời: người dùng không làm gì sai, thử lại là được (hiện nút "Thử lại")
export const isRetryable = (err: unknown) => ["network", "rate-limit", "server"].includes(errorKind(err));

// Máy chủ/proxy không trả lời theo dạng JSON thì client tự đặt "Lỗi 502"…: đó là mã kỹ thuật, không phải câu cho người dùng
const RAW_CODE = /^(Lỗi|Error)\s*\d{3}\b|^\s*$|<html|Internal Server Error|Failed to fetch|NetworkError|Unexpected token/i;

const GENERIC: Record<ErrorKind, string> = {
  network: "Mất kết nối mạng. Kiểm tra Internet rồi thử lại, dữ liệu của bạn vẫn còn nguyên.",
  "rate-limit": "Bạn thao tác hơi nhanh. Đợi một lát rồi thử lại nhé.",
  session: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục.",
  server: "Hệ thống đang gặp sự cố, không phải do bạn. Thử lại sau ít phút; nếu vẫn lỗi, nhắn Cóc Pass hoặc liên hệ hỗ trợ.",
  client: "Yêu cầu chưa hợp lệ. Kiểm tra lại thông tin rồi thử lại.",
  unknown: "Có lỗi không mong muốn. Bạn thử lại, nếu vẫn lỗi hãy tải lại trang.",
};

/**
 * Câu báo lỗi cho người dùng, luôn là tiếng Việt thường ngày, không mã lỗi, không nội dung kỹ thuật của máy chủ.
 * - Lỗi 4xx có thông điệp tiếng Việt từ máy chủ (vd "Số dư không đủ"): giữ nguyên vì đó là hướng dẫn cụ thể.
 * - Lỗi mạng, 429 không có lời nhắn, 5xx, hết phiên: dùng câu chuẩn kèm cách xử lý.
 * `fallback` chỉ dùng khi không xác định được nguyên nhân.
 */
export function errorMessage(err: unknown, fallback?: string): string {
  const kind = errorKind(err);
  if (kind === "unknown") return fallback ?? GENERIC.unknown;
  const apiErr = err as ApiError;
  if (kind === "server" || kind === "network") return GENERIC[kind];
  const raw = apiErr.message?.trim() ?? "";
  if (!raw || RAW_CODE.test(raw)) return GENERIC[kind];
  return raw;
}

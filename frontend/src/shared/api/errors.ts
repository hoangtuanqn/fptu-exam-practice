import { ApiError } from "@/shared/api/client";

// Nhóm lỗi để giao diện chọn cách xử lý: thử lại, đăng nhập lại, chờ rồi thử lại...
export type ErrorKind =
  | "network"
  | "rate-limit"
  | "session"
  | "payment"
  | "forbidden"
  | "not-found"
  | "too-large"
  | "invalid"
  | "maintenance"
  | "server"
  | "client"
  | "unknown";

// fetch tự ném TypeError khi mất mạng/bị chặn CORS ("Failed to fetch", "Load failed", "NetworkError…"); hết giờ chờ là AbortError/TimeoutError
const isFetchFailure = (err: unknown) =>
  (err instanceof TypeError && /fetch|network|load failed/i.test(err.message)) ||
  (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError"));

export function errorKind(err: unknown): ErrorKind {
  if (!(err instanceof ApiError)) return isFetchFailure(err) ? "network" : "unknown";
  const s = err.status;
  if (s === 0) return "network";
  if (s === 429) return "rate-limit";
  if (s === 401) return "session";
  if (s === 402) return "payment";
  if (s === 403) return "forbidden";
  if (s === 404) return "not-found";
  if (s === 413) return "too-large";
  if (s === 400 || s === 422) return "invalid";
  if (s === 502 || s === 503 || s === 504) return "maintenance";
  if (s >= 500) return "server";
  return "client";
}

// Lỗi tạm thời: người dùng không làm gì sai, thử lại là được (hiện nút "Thử lại").
// 503 kèm lời nhắn của máy chủ (vd "Tính năng ... tạm thời chưa khả dụng") là tính năng đang tắt, bấm thử lại ngay cũng không được.
export const isRetryable = (err: unknown) => {
  const kind = errorKind(err);
  if (kind === "maintenance") return !(err instanceof ApiError && err.status === 503 && usable(err.message));
  return ["network", "rate-limit", "server"].includes(kind);
};

// Máy chủ/proxy không trả lời theo dạng JSON thì client tự đặt "Lỗi 502"…: đó là mã kỹ thuật, không phải câu cho người dùng.
// Câu "Không tìm thấy GET /api/..." của máy chủ lộ đường dẫn nội bộ nên cũng bỏ.
const RAW_CODE = /^(Lỗi|Error)\s*\d{3}\b|^\s*$|<html|<!doctype|Failed to fetch|NetworkError|Load failed|Unexpected token|\b(GET|POST|PUT|PATCH|DELETE)\s+\/api\//i;
// Câu không có chữ tiếng Việt nào (vd "Internal Server Error", "Bad Gateway", "Unauthorized") là chuỗi kỹ thuật tiếng Anh
const VIETNAMESE = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

// Câu chung chung của máy chủ: có câu cụ thể hơn ở phía web thì dùng câu đó
const VAGUE = /^(Đã có lỗi xảy ra|Dữ liệu không hợp lệ|Dữ liệu đã tồn tại)\.?$/i;

const GENERIC: Record<ErrorKind, string> = {
  network: "Không kết nối được máy chủ. Kiểm tra Internet (wifi, 4G) rồi thử lại, dữ liệu bạn đã nhập vẫn còn nguyên.",
  "rate-limit": "Bạn thao tác hơi nhanh. Đợi một lát rồi thử lại nhé.",
  session: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục.",
  payment: "Số dư credit không đủ. Nạp thêm credit rồi thử lại nhé.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  "not-found": "Không tìm thấy nội dung này, có thể đã bị xóa. Hãy tải lại trang.",
  "too-large": "Tệp quá lớn. Hãy chọn tệp nhỏ hơn rồi thử lại.",
  invalid: "Thông tin chưa hợp lệ. Kiểm tra lại các ô đã nhập rồi gửi lại.",
  maintenance: "Hệ thống đang bảo trì hoặc khởi động lại, không phải do bạn. Thử lại sau ít phút nhé.",
  server: "Hệ thống đang gặp sự cố, không phải do bạn. Thử lại sau ít phút; nếu vẫn lỗi, nhắn Cóc Pass hoặc liên hệ hỗ trợ.",
  client: "Yêu cầu chưa thực hiện được. Kiểm tra lại thông tin rồi thử lại.",
  unknown: "Có lỗi không mong muốn. Bạn thử lại, nếu vẫn lỗi hãy tải lại trang.",
};

/** "45 giây" / "3 phút": thời gian chờ đọc được cho người dùng */
export const waitText = (seconds: number) => (seconds < 60 ? `${Math.max(1, Math.ceil(seconds))} giây` : `${Math.ceil(seconds / 60)} phút`);

const usable = (msg: string | undefined) => {
  const raw = msg?.trim() ?? "";
  return raw && VIETNAMESE.test(raw) && !RAW_CODE.test(raw) && !VAGUE.test(raw) ? raw : "";
};

/** Bỏ đoạn "…thử lại sau 15 phút" ở cuối câu: dùng khi giao diện đã có đồng hồ đếm ngược riêng, tránh hai mốc chờ khác nhau */
export const withoutWait = (message: string | null) =>
  message?.replace(/[\s,.;:–-]*(vui lòng\s+|hãy\s+)?thử lại sau\b[^.]*[.!]?\s*$/i, "").replace(/([^.!?])$/, "$1.") || message;

/**
 * Lời nhắn chung trùng đúng lỗi của một ô ĐANG HIỆN trên trang (vd "Email đã được sử dụng" dưới ô Email): không cần hộp lỗi chung nữa.
 * Ô không có trên trang (token, mã ẩn...) thì vẫn phải hiện ở hộp chung, nếu không người dùng không thấy lỗi.
 */
export const duplicatesVisibleField = (err: unknown, fields: readonly string[]) =>
  err instanceof ApiError && !!err.errors && fields.some((k) => err.errors?.[k] === err.message);

/**
 * Câu báo lỗi cho người dùng, luôn là tiếng Việt thường ngày, không mã lỗi, không nội dung kỹ thuật của máy chủ.
 * - Máy chủ gửi câu tiếng Việt cụ thể (vd "Số dư không đủ", "Email hoặc mật khẩu không đúng"): giữ nguyên vì đó là hướng dẫn cụ thể.
 * - 422 chỉ có câu chung "Dữ liệu không hợp lệ": nêu luôn lỗi của từng ô.
 * - 429: nói rõ phải chờ bao lâu nếu biết (header Retry-After).
 * - Mất mạng, 500, bảo trì (502/503/504 không kèm lời nhắn), câu kỹ thuật: dùng câu chuẩn kèm cách xử lý.
 * `fallback` (nêu rõ thao tác, vd "Không lưu được cài đặt") dùng khi không xác định được nguyên nhân.
 */
export function errorMessage(err: unknown, fallback?: string): string {
  const kind = errorKind(err);
  if (kind === "network") {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return "Bạn đang mất kết nối Internet. Kết nối lại rồi thử lại, dữ liệu bạn đã nhập vẫn còn nguyên.";
    return GENERIC.network;
  }
  if (!(err instanceof ApiError)) return fallback ?? GENERIC.unknown;
  // 500: lời nhắn (nếu có) là chi tiết kỹ thuật, không cho người dùng xem
  if (kind === "server") return GENERIC.server;

  const own = usable(err.message);
  if (kind === "rate-limit") {
    const wait = err.retryAfter ? `Thử lại sau ${waitText(err.retryAfter)} nhé.` : "";
    if (own) return wait && !/\d/.test(own) ? `${own.replace(/[.!]?$/, ".")} ${wait}` : own;
    return wait ? `Bạn thao tác hơi nhanh. ${wait}` : GENERIC["rate-limit"];
  }
  if (own) return own;
  if (kind === "invalid" && err.errors) {
    const details = [...new Set(Object.values(err.errors).map((m) => usable(m)).filter(Boolean))];
    if (details.length) return `Thông tin chưa hợp lệ: ${details.join("; ")}`;
  }
  // Lỗi 4xx chung chung (409, 400 không rõ): câu của nơi gọi (nêu thao tác) rõ hơn câu chuẩn
  if (kind === "client" || kind === "invalid") return fallback ?? GENERIC[kind];
  return GENERIC[kind];
}

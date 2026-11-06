import { getGuestId } from "@/shared/api/guest";
import type { Paged } from "@/shared/types/api";

// Địa chỉ API khi web và API khác domain (vd https://api.fepass.top). Để trống khi dev: đi qua proxy của Vite
export const API_ORIGIN = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/+$/, "");
export const BASE = `${API_ORIGIN}/api/v1`;
const TOKEN_KEY = "auth_token";

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* bỏ qua: trình duyệt chặn lưu trữ */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* bỏ qua */
    }
  },
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string>, // lỗi theo từng trường, để hiện dưới ô nhập
  ) {
    super(message);
  }
}

// Khi token hết hạn/không hợp lệ, AuthContext đăng ký hàm này để đăng xuất
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn;
};

type Query = Record<string, string | number | undefined | null>;

// Access token sống ngắn. Hết hạn thì đổi refresh token (cookie httpOnly, JavaScript không đọc được) lấy cái mới.
// "ok" = đã có token mới; "invalid" = phiên hết hạn/bị thu hồi (phải đăng nhập lại); "unavailable" = chưa hỏi được máy chủ (giữ nguyên phiên).
export type RefreshResult = "ok" | "invalid" | "unavailable";
let refreshing: Promise<RefreshResult> | null = null;

// Nhiều request cùng gặp 401 thì chỉ gửi một yêu cầu làm mới và dùng chung kết quả
export function refreshAccessToken(): Promise<RefreshResult> {
  refreshing ??= (async (): Promise<RefreshResult> => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
      const json = (await res.json().catch(() => null)) as Envelope<{ token: string }> | null;
      if (res.ok && json?.status && json.data?.token) {
        tokenStore.set(json.data.token);
        return "ok";
      }
      if (res.status === 401 || res.status === 403) {
        onUnauthorized?.();
        return "invalid";
      }
      return "unavailable";
    } catch {
      return "unavailable";
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

interface Envelope<T> {
  status: boolean;
  message: string;
  data?: T;
  meta?: Paged<T>["meta"];
  errors?: Record<string, string>;
}

async function send<T>(method: string, path: string, body?: unknown, query?: Query, keepalive = false, retried = false): Promise<Envelope<T>> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));

  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}${qs.size ? `?${qs}` : ""}`, {
      method,
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        "X-Guest-Id": getGuestId(),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      keepalive, // cho phép request kịp gửi khi trang đang đóng/tải lại
      credentials: "include", // gửi kèm cookie phiên đăng nhập (API khác domain với web)
    });
  } catch {
    throw new ApiError("Không kết nối được máy chủ", 0);
  }

  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !json?.status) {
    // Chỉ xử lý khi đã gửi token; sai mật khẩu lúc đăng nhập cũng trả 401 nhưng không có token
    if (res.status === 401 && token) {
      if (retried) onUnauthorized?.(); // đã làm mới mà vẫn bị từ chối
      else {
        // Request khác vừa làm mới xong thì dùng luôn token mới, không cần làm mới nữa
        const result = tokenStore.get() !== token ? "ok" : await refreshAccessToken();
        if (result === "ok") return send<T>(method, path, body, query, keepalive, true);
      }
    }
    throw new ApiError(json?.message ?? `Lỗi ${res.status}`, res.status, json?.errors);
  }
  return json;
}

export const http = {
  get: async <T>(path: string, query?: Query) => (await send<T>("GET", path, undefined, query)).data as T,
  post: async <T>(path: string, body?: unknown) => (await send<T>("POST", path, body ?? {})).data as T,
  put: async <T>(path: string, body: unknown, keepalive = false) => (await send<T>("PUT", path, body, undefined, keepalive)).data as T,
  delete: async (path: string) => void (await send<unknown>("DELETE", path)),
  patch: async <T>(path: string, body: unknown) => (await send<T>("PATCH", path, body)).data as T,
  // Danh sách có phân trang: backend trả { data: [...], meta }
  async list<T>(path: string, query?: Query): Promise<Paged<T>> {
    const json = await send<T[]>("GET", path, undefined, query);
    return { items: json.data ?? [], meta: json.meta! };
  },
};

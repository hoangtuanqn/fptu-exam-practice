import { settingRepository } from "../../repositories/setting.repository";
import { CRAWLER_KEY_PREFIX } from "../../constants/crawler";
import { crawlerSettingService } from "../crawler-setting.service";
import { FUO_AUTH_MESSAGE, FuoAuthError } from "./fuo-client";
import { FuoLoginError, loginFuo } from "./fuo-login";

const COOLDOWN_MS = 5 * 60 * 1000; // tối thiểu giữa hai lần đăng nhập: tránh khoá tài khoản khi sai mật khẩu
let lastAttemptAt = 0;
let inflight: Promise<LoginResult> | null = null;

export type LoginResult = { ok: true } | { ok: false; message: string };

const save = (entries: Record<string, string>) =>
  settingRepository.setMany(Object.fromEntries(Object.entries(entries).map(([k, v]) => [`${CRAWLER_KEY_PREFIX}${k}`, v])));

// Lỗi do cookie/phiên hết hạn (không phải lỗi mạng hay 404)
export const isFuoAuthFailure = (err: unknown) =>
  err instanceof FuoAuthError || (err instanceof Error && (err.cause instanceof FuoAuthError || err.message === FUO_AUTH_MESSAGE));

async function doLogin(force: boolean): Promise<LoginResult> {
  const config = await crawlerSettingService.get();
  if (!config.loginEmail || !config.loginPassword) return { ok: false, message: "Chưa lưu email/mật khẩu FuOverflow" };
  if (!force && Date.now() - lastAttemptAt < COOLDOWN_MS) return { ok: false, message: "Vừa thử đăng nhập, vui lòng đợi vài phút" };
  lastAttemptAt = Date.now();

  try {
    const cookie = await loginFuo({ email: config.loginEmail, password: config.loginPassword, userAgent: config.userAgent, baseCookie: config.cookie });
    await save({ cookie, loginLastAt: new Date().toISOString(), loginLastError: "" });
    console.log("[fuo-session] đã đăng nhập FuOverflow và làm mới cookie");
    return { ok: true };
  } catch (err) {
    const message = err instanceof FuoLoginError ? err.message : "Đăng nhập FuOverflow thất bại";
    await save({ loginLastAt: new Date().toISOString(), loginLastError: message });
    console.error(`[fuo-session] ${message}`);
    return { ok: false, message };
  }
}

export const fuoSessionService = {
  /** Đăng nhập lấy cookie mới và lưu vào cấu hình. `force` bỏ qua thời gian chờ (admin bấm tay). Các lời gọi cùng lúc dùng chung một lượt. */
  login(force = false): Promise<LoginResult> {
    inflight ??= doLogin(force).finally(() => (inflight = null));
    return inflight;
  },

  /** Chưa có cookie mà đã lưu tài khoản: đăng nhập trước khi chạy job. */
  async ensureCookie() {
    const config = await crawlerSettingService.get();
    if (!config.cookie && config.loginEmail && config.loginPassword) await this.login();
  },
};

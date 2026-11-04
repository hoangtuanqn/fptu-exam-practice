import { FUO_HOST } from "../../constants/crawler";

const BASE = `https://${FUO_HOST}`;
const TIMEOUT_MS = 30_000;

// Lỗi đăng nhập có lời nhắn dành cho admin (không chứa mật khẩu)
export class FuoLoginError extends Error {}

type Jar = Map<string, string>;

const toHeader = (jar: Jar) => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

// Cookie của Cloudflare (cf_clearance, __cf_bm...) gắn với IP + User-Agent, lấy từ cookie admin đã dán.
// Giữ lại để đăng nhập chung phiên với Cloudflare; mọi cookie khác (phiên XenForo cũ) bỏ đi.
function seedJar(baseCookie: string): Jar {
  const jar: Jar = new Map();
  for (const part of baseCookie.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const name = part.slice(0, i).trim();
    if (name === "cf_clearance" || name.startsWith("__cf")) jar.set(name, part.slice(i + 1).trim());
  }
  return jar;
}

function absorb(jar: Jar, res: Response) {
  for (const line of res.headers.getSetCookie()) {
    const [pair] = line.split(";");
    const i = pair!.indexOf("=");
    if (i < 0) continue;
    const name = pair!.slice(0, i).trim();
    const value = pair!.slice(i + 1).trim();
    // Giá trị rỗng hoặc đã hết hạn = server yêu cầu xoá cookie
    if (value === "" || value === "deleted" || /max-age=0/i.test(line)) jar.delete(name);
    else jar.set(name, value);
  }
}

const isChallenge = (res: Response, body: string) =>
  res.headers.get("cf-mitigated") === "challenge" ||
  ((res.status === 403 || res.status === 503) && /just a moment|cf-chl|challenge-platform/i.test(body));

const CHALLENGE_MESSAGE =
  "FuOverflow đang chặn bằng Cloudflare nên không đăng nhập tự động được. Hãy dán lại cookie có cf_clearance mới (cùng User-Agent) một lần, sau đó hệ thống sẽ tự làm mới phiên đăng nhập.";

function csrfOf(html: string) {
  return html.match(/name="_xfToken"[^>]*value="([^"]+)"/)?.[1] ?? html.match(/data-csrf="([^"]+)"/)?.[1] ?? null;
}

/**
 * Đăng nhập XenForo của FuOverflow bằng email + mật khẩu, trả về chuỗi cookie mới (xf_user, xf_session, + cookie Cloudflare giữ lại).
 * Không ghi mật khẩu ra log. Không vượt được thử thách Cloudflare/2FA: gặp thì ném FuoLoginError có hướng dẫn.
 */
export async function loginFuo(opts: { email: string; password: string; userAgent: string; baseCookie: string }): Promise<string> {
  const jar = seedJar(opts.baseCookie);
  const common = { "user-agent": opts.userAgent, "accept-language": "vi,en-US;q=0.9,en;q=0.8" };

  let page: Response;
  try {
    page = await fetch(`${BASE}/login/`, {
      headers: { ...common, accept: "text/html", cookie: toHeader(jar), referer: `${BASE}/` },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new FuoLoginError("Không kết nối được tới FuOverflow");
  }
  absorb(jar, page);
  const html = await page.text();
  if (isChallenge(page, html)) throw new FuoLoginError(CHALLENGE_MESSAGE);
  const token = csrfOf(html);
  if (!token) throw new FuoLoginError("Không đọc được trang đăng nhập của FuOverflow (có thể trang đã đổi giao diện)");

  const form = new URLSearchParams({ login: opts.email, password: opts.password, remember: "1", _xfRedirect: `${BASE}/`, _xfToken: token });
  let res: Response;
  try {
    res = await fetch(`${BASE}/login/login`, {
      method: "POST",
      headers: { ...common, accept: "text/html", "content-type": "application/x-www-form-urlencoded", cookie: toHeader(jar), origin: BASE, referer: `${BASE}/login/` },
      body: form,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new FuoLoginError("Không kết nối được tới FuOverflow");
  }
  absorb(jar, res);

  const location = res.headers.get("location") ?? "";
  if (/two-step|two_step/i.test(location)) {
    throw new FuoLoginError("Tài khoản FuOverflow bật xác thực 2 bước nên không đăng nhập tự động được");
  }
  if (jar.has("xf_user")) return toHeader(jar);

  const body = res.status === 200 ? await res.text() : "";
  if (isChallenge(res, body)) throw new FuoLoginError(CHALLENGE_MESSAGE);
  if (res.status === 200) throw new FuoLoginError("Sai email hoặc mật khẩu FuOverflow (hoặc tài khoản bị khoá)");
  throw new FuoLoginError(`FuOverflow từ chối đăng nhập (HTTP ${res.status})`);
}

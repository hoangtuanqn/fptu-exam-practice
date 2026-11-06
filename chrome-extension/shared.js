// Cấu hình dùng chung cho content script, background và popup.
// Giá trị mặc định trỏ tới hệ thống thật; chỉ đổi khi chạy thử trên máy (xem popup > Nâng cao).
const FEPASS_DEFAULTS = {
  enabled: true,
  siteUrl: "https://fepass.top",
  apiUrl: "https://api.fepass.top",
};

// Trạng thái "in" cũ hơn mức này coi như chưa chắc (phiên đăng nhập của website sống tối đa 30 ngày không dùng)
const FEPASS_AUTH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Chỉ nhận địa chỉ https, hoặc http://localhost khi chạy thử; bỏ dấu / ở cuối. Sai thì trả về giá trị mặc định.
function fepassSanitizeUrl(value, fallback) {
  try {
    const u = new URL(String(value || "").trim());
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (u.protocol !== "https:" && !(u.protocol === "http:" && local)) return fallback;
    return u.origin;
  } catch {
    return fallback;
  }
}

async function fepassGetSettings() {
  const raw = await chrome.storage.sync.get(FEPASS_DEFAULTS);
  return {
    enabled: raw.enabled !== false,
    siteUrl: fepassSanitizeUrl(raw.siteUrl, FEPASS_DEFAULTS.siteUrl),
    apiUrl: fepassSanitizeUrl(raw.apiUrl, FEPASS_DEFAULTS.apiUrl),
  };
}

// Trạng thái đăng nhập fepass.top do content script chạy trên chính website ghi lại (chỉ "in"/"out" và tên hiển thị, không có token).
// Trả về { loggedIn, name }. Chưa từng ghi nhận, khác địa chỉ website đang cấu hình, hoặc quá cũ thì coi là chưa đăng nhập.
async function fepassGetAuth(siteUrl) {
  const { fepassAuth } = await chrome.storage.local.get("fepassAuth");
  const ok = fepassAuth && fepassAuth.origin === siteUrl && Date.now() - fepassAuth.at < FEPASS_AUTH_TTL_MS;
  return { loggedIn: !!ok && fepassAuth.state === "in", name: ok ? fepassAuth.name || "" : "" };
}

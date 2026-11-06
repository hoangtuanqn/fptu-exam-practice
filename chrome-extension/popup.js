const $ = (id) => document.getElementById(id);
const msg = (text, err) => {
  $("msg").textContent = text;
  $("msg").className = "msg" + (err ? " err" : "");
};

async function showUpdate() {
  const { update } = await chrome.storage.local.get("update");
  const el = $("update");
  if (update && fepassIsNewer(update.version, chrome.runtime.getManifest().version)) {
    $("updateVer").textContent = update.version;
    el.href = update.url;
    el.hidden = false;
  } else el.hidden = true;
}

async function load() {
  showUpdate();
  const s = await fepassGetSettings();
  const auth = await fepassGetAuth(s.siteUrl);
  $("status").className = "status " + (auth.loggedIn ? "in" : "out");
  $("statusText").textContent = auth.loggedIn ? `Đã đăng nhập fepass.top${auth.name ? ": " + auth.name : ""}` : "Chưa đăng nhập fepass.top (mở fepass.top rồi đăng nhập)";
  $("login").href = `${s.siteUrl}/login`;
  $("enabled").checked = s.enabled;
  $("siteUrl").value = s.siteUrl;
  $("apiUrl").value = s.apiUrl;
  $("open").href = s.siteUrl;
}

// Công tắc bật/tắt lưu ngay
$("enabled").addEventListener("change", () => chrome.storage.sync.set({ enabled: $("enabled").checked }));

$("save").addEventListener("click", async () => {
  const site = fepassSanitizeUrl($("siteUrl").value, null);
  const api = fepassSanitizeUrl($("apiUrl").value, null);
  if (!site || !api) return msg("Địa chỉ phải bắt đầu bằng https:// (hoặc http://localhost khi chạy thử).", true);
  await chrome.storage.sync.set({ siteUrl: site, apiUrl: api });
  await chrome.storage.local.remove("prices"); // đổi API thì bỏ giá đã nhớ
  $("open").href = site;
  msg("Đã lưu.");
});

$("reset").addEventListener("click", async () => {
  await chrome.storage.sync.set({ siteUrl: FEPASS_DEFAULTS.siteUrl, apiUrl: FEPASS_DEFAULTS.apiUrl });
  await chrome.storage.local.remove("prices");
  await load();
  msg("Đã về mặc định.");
});

load();

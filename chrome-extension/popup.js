const $ = (id) => document.getElementById(id);
const msg = (text, err) => {
  $("msg").textContent = text;
  $("msg").className = "msg" + (err ? " err" : "");
};

// Tạo phần tử bằng DOM (không dùng innerHTML): dữ liệu hiển thị luôn là văn bản thuần
const el = (tag, props = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  n.append(...kids);
  return n;
};
const bold = (text) => el("b", { text });

const RUNNING_STALE_MS = 3 * 60 * 1000; // đang chạy mà quá lâu không có tin mới: coi như đã dừng (đóng tab giữa chừng)
const ERROR_SHOW_MS = 30 * 60 * 1000;

const REASONS = {
  off: "Đồng bộ điểm FAP đang tắt. Hãy bật ở trang Điểm FAP trên fepass.top.",
  challenge: "FAP đang yêu cầu kiểm tra Cloudflare. Hoàn thành bước kiểm tra trên trang FAP rồi bấm Đồng bộ ngay lại.",
  login: "Bạn chưa đăng nhập FAP. Hãy đăng nhập FAP rồi bấm Đồng bộ ngay lại.",
};

let armedClear = false; // nút xoá dữ liệu: bấm lần đầu để xác nhận, lần hai mới xoá
let armedTimer = null;
let flash = null; // thông báo ngắn sau một thao tác trong popup

async function showUpdate() {
  await chrome.runtime.sendMessage({ type: "checkUpdate" }).catch(() => undefined); // mỗi lần mở popup: kiểm tra bản mới trước khi hiển thị
  const { update } = await chrome.storage.local.get("update");
  const node = $("update");
  if (update && fepassIsNewer(update.version, chrome.runtime.getManifest().version)) {
    $("updateVer").textContent = update.version;
    node.href = update.url;
    node.hidden = false;
  } else node.hidden = true;
}

// ---- Thẻ "Điểm FAP"
async function syncNow(button) {
  button.disabled = true;
  await chrome.storage.local.set({ fapSync: { state: "running", message: "Đang bắt đầu…", at: Date.now() } });
  let res = null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id !== undefined) res = await chrome.tabs.sendMessage(tab.id, { type: "fepass:sync" });
  } catch {
    res = null; // tab đang mở không phải trang FAP (không có ai nhận tin nhắn)
  }
  if (res && res.ok) return; // trang FAP đang đọc; popup theo dõi tiến độ qua bộ nhớ
  if (res && res.reason && res.reason !== "not-grade") {
    await chrome.storage.local.set({ fapSync: { state: "error", message: REASONS[res.reason] || "Chưa đọc được điểm.", at: Date.now() } });
    return;
  }
  // Chưa ở trang Báo cáo điểm: mở trang đó, tiện ích tự đọc ngay khi trang tải xong
  await chrome.storage.local.set({ fapSync: { state: "running", message: "Đang mở trang Báo cáo điểm FAP…", at: Date.now() } });
  await chrome.tabs.create({ url: `${FEPASS_GRADE_URL}#fepass-sync` });
  window.close();
}

function clearData() {
  if (!armedClear) {
    armedClear = true;
    clearTimeout(armedTimer);
    armedTimer = setTimeout(() => {
      armedClear = false;
      render();
    }, 4000);
    return render();
  }
  armedClear = false;
  clearTimeout(armedTimer);
  flash = { tone: "ok", text: "Đã xoá điểm đã đọc trong tiện ích. Dữ liệu đã lưu trên fepass.top được xoá khi bạn tắt đồng bộ ở trang Điểm FAP." };
  chrome.storage.local.remove(["fapGrades", "fapSync", "fapUploadedAt"]);
}

function gradesBody(ctx) {
  const { s, auth, st } = ctx;
  const body = document.createDocumentFragment();
  const sync = !!(st.gradeSync && st.gradeSync.origin === s.siteUrl && st.gradeSync.enabled);
  const grades = st.fapGrades || null;
  const pill = $("gpill");

  if (!auth.loggedIn) {
    pill.textContent = "Cần đăng nhập";
    pill.className = "pill off";
    body.append(
      el("p", { class: "meta", text: "Đăng nhập fepass.top để bật đồng bộ điểm." }),
      el("a", { class: "btn block", href: `${s.siteUrl}/login`, target: "_blank", rel: "noopener", text: "Đăng nhập fepass.top" }),
    );
    return body;
  }

  if (!sync) {
    pill.textContent = "Đang tắt";
    pill.className = "pill off";
    body.append(
      el("p", { class: "meta", text: "Bạn toàn quyền quyết định: bật công tắc “Đồng bộ điểm FAP” ở trang Điểm FAP (mặc định tắt). Tắt lúc nào cũng được." }),
      el("a", { class: "btn block", href: `${s.siteUrl}/account/grades`, target: "_blank", rel: "noopener", text: "Bật trên FePass" }),
    );
    return body;
  }

  pill.textContent = "Đang bật";
  pill.className = "pill on";

  // Trạng thái đang chạy / lỗi gần nhất
  const run = st.fapSync || null;
  const running = !!run && run.state === "running" && Date.now() - run.at < RUNNING_STALE_MS;
  const failed = !!run && run.state === "error" && Date.now() - run.at < ERROR_SHOW_MS;

  body.append(
    el(
      "p",
      { class: "meta" },
      ...(grades
        ? ["Đọc lúc ", bold(fepassFormatTime(grades.at)), ` · ${grades.courses.length} môn · ${(grades.exams || []).length} buổi thi`]
        : ["Chưa đọc điểm lần nào."]),
    ),
  );

  if (flash) body.append(el("div", { class: `note ${flash.tone}`, role: "status", text: flash.text }));

  if (running) {
    const frac = typeof run.total === "number" && run.total > 0 ? Math.min(1, (run.done || 0) / run.total) : null;
    const bar = el("div", { class: "bar" + (frac === null ? "" : " det"), "aria-hidden": "true" }, el("i", frac === null ? {} : { style: `width:${Math.round(frac * 100)}%` }));
    body.append(el("div", { class: "note ok", role: "status", text: run.message || "Đang đọc điểm…" }), bar);
  } else if (failed) {
    body.append(el("div", { class: "note err", role: "alert", text: run.message || "Chưa đọc được điểm." }));
  } else if (grades) {
    const uploaded = st.fapUploadedAt && st.fapUploadedAt.origin === s.siteUrl ? st.fapUploadedAt.at : 0;
    if (Date.now() - grades.at > FEPASS_STALE_MS) body.append(el("div", { class: "note", text: "Điểm đã đọc hơn 14 ngày trước. Nên đồng bộ lại." }));
    else if (uploaded >= grades.at) body.append(el("div", { class: "note ok", text: `Đã gửi lên FePass lúc ${fepassFormatTime(uploaded)}.` }));
    else body.append(el("div", { class: "note", text: "Chờ gửi lên FePass: mở trang Điểm FAP trên fepass.top để hoàn tất (trang đang mở thì tự cập nhật)." }));
  }

  const button = el("button", { type: "button", class: "btn block", text: running ? "Đang đồng bộ…" : "Đồng bộ ngay" });
  button.disabled = running;
  button.addEventListener("click", () => void syncNow(button));

  const links = el(
    "div",
    { class: "links" },
    el("a", { href: `${s.siteUrl}/account/grades`, target: "_blank", rel: "noopener", text: "Xem điểm cần đạt" }),
    el("a", { href: FEPASS_GRADE_URL, target: "_blank", rel: "noopener", text: "Mở Báo cáo điểm FAP" }),
  );
  if (grades) {
    links.append(
      el("button", {
        type: "button",
        class: "link danger" + (armedClear ? " armed" : ""),
        title: "Xoá điểm và lịch thi đã đọc nằm trong tiện ích này",
        text: armedClear ? "Bấm lần nữa để xoá" : "Xoá dữ liệu đã đọc",
        onclick: clearData,
      }),
    );
  }
  body.append(button, links);
  return body;
}

// ---- Vẽ lại phần thay đổi theo dữ liệu (không đụng tới ô nhập ở mục Nâng cao)
async function render() {
  const s = await fepassGetSettings();
  const auth = await fepassGetAuth(s.siteUrl);
  const st = await chrome.storage.local.get(["gradeSync", "fapGrades", "fapSync", "fapUploadedAt", "fapNoticeUntil", "onboarded"]);

  $("status").className = "status " + (auth.loggedIn ? "in" : "out");
  $("statusText").textContent = auth.loggedIn ? `Đã đăng nhập fepass.top${auth.name ? ": " + auth.name : ""}` : "Chưa đăng nhập fepass.top";
  $("login").href = `${s.siteUrl}/login`;
  $("open").href = s.siteUrl;
  $("welcome").hidden = !!st.onboarded;

  $("gbody").replaceChildren(gradesBody({ s, auth, st }));
  flash = null; // chỉ hiện một lần

  const until = st.fapNoticeUntil || 0;
  const hidden = until > Date.now();
  $("notice").checked = !hidden;
  $("noticeText").textContent = hidden ? `Đang ẩn đến ${fepassFormatTime(until)}. Bật lại để hiện ngay.` : "Hiện ở góc màn hình khi bạn mở FAP. Bấm ✕ trên thông báo để ẩn 24 giờ.";
}

async function load() {
  showUpdate();
  const s = await fepassGetSettings();
  $("ver").textContent = `Phiên bản ${chrome.runtime.getManifest().version}`;
  $("enabled").checked = s.enabled;
  $("siteUrl").value = s.siteUrl;
  $("apiUrl").value = s.apiUrl;
  await render();
}

// Công tắc lưu ngay
$("enabled").addEventListener("change", () => chrome.storage.sync.set({ enabled: $("enabled").checked }));
$("notice").addEventListener("change", () => {
  if ($("notice").checked) chrome.storage.local.remove("fapNoticeUntil");
  else chrome.storage.local.set({ fapNoticeUntil: Date.now() + FEPASS_SNOOZE_MS });
});
$("welcomeOk").addEventListener("click", () => chrome.storage.local.set({ onboarded: true }));

$("save").addEventListener("click", async () => {
  const site = fepassSanitizeUrl($("siteUrl").value, null);
  const api = fepassSanitizeUrl($("apiUrl").value, null);
  if (!site || !api) return msg("Địa chỉ phải bắt đầu bằng https:// (hoặc http://localhost khi chạy thử).", true);
  await chrome.storage.sync.set({ siteUrl: site, apiUrl: api });
  await chrome.storage.local.remove("prices"); // đổi API thì bỏ giá đã nhớ
  await render();
  msg("Đã lưu.");
});

$("reset").addEventListener("click", async () => {
  await chrome.storage.sync.set({ siteUrl: FEPASS_DEFAULTS.siteUrl, apiUrl: FEPASS_DEFAULTS.apiUrl });
  await chrome.storage.local.remove("prices");
  await load();
  msg("Đã về mặc định.");
});

// Dữ liệu đổi (đang đồng bộ, vừa đọc xong, vừa gửi lên website...) thì vẽ lại ngay
chrome.storage.onChanged.addListener(() => void render());

load();

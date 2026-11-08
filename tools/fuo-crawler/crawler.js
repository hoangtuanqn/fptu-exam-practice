// Trang công cụ: lấy danh sách bài của từng môn trên FuOverflow (chỉ tên đề và thông tin mô tả, không tải ảnh).
// Gọi bằng phiên trình duyệt của bạn (host_permissions cho phép gửi cookie), phân tích bằng FuoParser, lưu kết quả vào chrome.storage.local để tải lại trang không mất.
const BASE = "https://fuoverflow.com";
const STORE_KEY = "fuo.results";
const DELAY_MS = 500; // nghỉ giữa hai yêu cầu để không dồn tải lên FuOverflow
const MAX_PAGES = 80; // chặn vòng lặp vô hạn nếu phân trang đọc sai
const FE_LABEL = "Đề Thi FE"; // chỉ giữ các bài có nhãn này (các nhãn khác như Đề Thi PE bị bỏ)

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @type {Record<string, any>} mã môn -> kết quả đã lưu */
let results = {};
let live = {};
let order = [];
let running = false;
let stopRequested = false;

const parseCodes = (raw) => [...new Set(raw.split(/[\s,;]+/).map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z0-9]{2,12}$/.test(c)))];

async function loadSaved() {
  const data = await chrome.storage.local.get(STORE_KEY);
  results = data[STORE_KEY] || {};
  order = Object.keys(results).sort();
  order.forEach((c) => (live[c] = { state: results[c].status }));
}
const save = () => chrome.storage.local.set({ [STORE_KEY]: results });

class BlockedError extends Error {}

/** Tải một trang và trả về { doc, url } (url cuối cùng sau khi chuyển hướng). null nếu 404. */
async function fetchDoc(url) {
  let res;
  try {
    res = await fetch(url, { credentials: "include" });
  } catch {
    await sleep(1500); // mạng chập chờn: thử lại một lần
    res = await fetch(url, { credentials: "include" });
  }
  if (res.status === 404 || res.status === 410) return null;
  if (res.status === 403 || res.status === 429 || res.status === 503) throw new BlockedError(`FuOverflow chặn yêu cầu (mã ${res.status}). Mở FuOverflow ở một tab, vượt kiểm tra rồi chạy lại`);
  if (!res.ok) throw new Error(`FuOverflow trả mã ${res.status}`);
  const doc = new DOMParser().parseFromString(await res.text(), "text/html");
  if (FuoParser.looksBlocked(doc)) throw new BlockedError("FuOverflow hiện trang kiểm tra Cloudflare. Mở FuOverflow ở một tab, vượt kiểm tra rồi chạy lại");
  return { doc, url: res.url };
}

async function crawlOne(code) {
  const first = await fetchDoc(`${BASE}/forums/${code}/`);
  if (!first) return { code, status: "none", note: "FuOverflow không có môn này", crawledAt: Date.now() };
  // XenForo chuyển /forums/PRO192/ sang /forums/pro192.123/: các trang sau dựng từ địa chỉ cuối cùng
  const base = first.url.replace(/[?#].*$/, "").replace(/\/page-\d+\/?$/, "").replace(/\/?$/, "/");
  if (!/\/forums\//.test(base)) return { code, status: "none", note: "Bị chuyển hướng khỏi trang diễn đàn (có thể môn không tồn tại hoặc cần đăng nhập)", crawledAt: Date.now() };

  const page1 = FuoParser.parseForumPage(first.doc);
  const lastPage = Math.min(page1.lastPage, MAX_PAGES);
  const byId = new Map(page1.threads.map((t) => [t.threadId, t]));
  for (let p = 2; p <= lastPage; p++) {
    if (stopRequested) throw new Error("STOP");
    await sleep(DELAY_MS);
    const next = await fetchDoc(`${base}page-${p}`);
    if (!next) break;
    for (const t of FuoParser.parseForumPage(next.doc).threads) byId.set(t.threadId, t); // khử trùng (bài mới đẩy bài cũ sang trang sau)
  }
  const all = [...byId.values()];
  return { code, status: "ok", forumUrl: base, pages: lastPage, truncated: page1.lastPage > MAX_PAGES, scanned: all.length, threads: all.filter((t) => t.prefix === FE_LABEL), crawledAt: Date.now() };
}

function render() {
  const tbody = $("rows");
  tbody.textContent = "";
  for (const code of order) {
    const st = live[code] || { state: "wait" };
    const r = results[code];
    const tr = document.createElement("tr");
    const cell = (t, cls) => {
      const td = document.createElement("td");
      if (cls) td.className = cls;
      td.textContent = t;
      tr.appendChild(td);
      return td;
    };
    cell(code).style.fontWeight = "600";
    const label = { wait: "Chờ", run: "Đang lấy…", ok: "Xong", none: "Không có", err: "Lỗi" }[st.state] || st.state;
    const statusCell = cell(label, { wait: "s-wait", run: "s-run", ok: "s-ok", none: "s-bad", err: "s-bad" }[st.state]);
    const note = st.note || (r && r.note);
    if (note) {
      const small = document.createElement("small");
      small.textContent = note;
      statusCell.appendChild(small);
    }
    const ok = r && r.status === "ok";
    cell(ok ? String(r.scanned ?? r.threads.length) : "", "num");
    cell(ok ? String(r.threads.length) : "", "num");
    cell(ok ? String(r.pages) : "", "num");
    tbody.appendChild(tr);
  }
  const done = Object.values(results).filter((r) => r.status === "ok").length;
  $("download").disabled = done === 0;
}

function setStatus(text, bad = false) {
  const el = $("status");
  el.textContent = text;
  el.className = "status" + (bad ? " bad" : "");
}

function exportJson() {
  const subjects = Object.values(results)
    .filter((r) => r.status === "ok")
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(({ code, forumUrl, pages, truncated, threads }) => ({ code, forumUrl, pages, truncated, threads })); // threads chỉ gồm đề FE
  return JSON.stringify({ source: BASE, exportedAt: new Date().toISOString(), subjects }, null, 1);
}

async function run() {
  const typed = parseCodes($("codes").value);
  if (typed.length === 0) return setStatus("Hãy nhập ít nhất một mã môn (ví dụ PRO192) hoặc bấm nạp danh sách môn.", true);
  const redo = $("redo").checked;
  const todo = typed.filter((c) => redo || !results[c] || results[c].status === "err");
  order = [...new Set([...order, ...typed])].sort();
  typed.forEach((c) => {
    if (!live[c] || todo.includes(c)) live[c] = { state: todo.includes(c) ? "wait" : results[c].status };
  });
  if (todo.length === 0) {
    render();
    return setStatus("Các môn này đã có kết quả. Tick “Lấy lại” nếu muốn lấy mới.");
  }

  running = true;
  stopRequested = false;
  $("start").disabled = true;
  $("stop").disabled = false;
  let fatal = null;
  let i = 0;
  for (const code of todo) {
    if (stopRequested) break;
    i++;
    live[code] = { state: "run" };
    setStatus(`Đang lấy ${code} (${i}/${todo.length})…`);
    render();
    try {
      results[code] = await crawlOne(code);
      live[code] = { state: results[code].status };
    } catch (e) {
      if (e instanceof Error && e.message === "STOP") {
        live[code] = { state: results[code] ? results[code].status : "wait" };
        break;
      }
      const msg = e instanceof Error ? e.message : String(e);
      results[code] = { code, status: "err", note: msg, crawledAt: Date.now() };
      live[code] = { state: "err", note: msg };
      if (e instanceof BlockedError) fatal = msg; // bị chặn thì các môn sau cũng hỏng: dừng sớm
    }
    await save();
    render();
    if (fatal) break;
    await sleep(DELAY_MS);
  }
  running = false;
  $("start").disabled = false;
  $("stop").disabled = true;
  const ok = todo.filter((c) => results[c] && results[c].status === "ok").length;
  if (fatal) setStatus(fatal, true);
  else setStatus(stopRequested ? `Đã dừng. Xong ${ok}/${todo.length} môn.` : `Hoàn tất: ${ok}/${todo.length} môn lấy được. Bấm “Tải JSON” để lưu.`);
}

$("start").addEventListener("click", () => void run());
$("stop").addEventListener("click", () => {
  stopRequested = true;
  setStatus("Đang dừng sau trang hiện tại…");
});
$("fill").addEventListener("click", () => {
  $("codes").value = (window.FEPASS_SUBJECT_CODES || []).join("\n");
  setStatus(`Đã nạp ${(window.FEPASS_SUBJECT_CODES || []).length} môn. Môn đã có kết quả sẽ được bỏ qua.`);
});
$("download").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([exportJson()], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `fuo-catalog-${new Date().toISOString().slice(0, 10)}.json` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
});
$("clear").addEventListener("click", async () => {
  if (running) return setStatus("Hãy dừng trước khi xóa.", true);
  if (!confirm("Xóa toàn bộ kết quả đã lấy?")) return;
  results = {};
  live = {};
  order = [];
  await save();
  render();
  setStatus("Đã xóa kết quả.");
});

void loadSaved().then(() => {
  render();
  if (order.length) setStatus(`Đã có ${Object.values(results).filter((r) => r.status === "ok").length} môn lưu từ lần trước.`);
});

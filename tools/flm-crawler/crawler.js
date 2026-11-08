// Trang công cụ: lấy syllabus theo danh sách mã môn. Gọi FLM bằng phiên đăng nhập của trình duyệt (host_permissions cho phép gửi cookie),
// phân tích HTML bằng FlmParser, lưu kết quả vào chrome.storage.local để tải lại trang không mất.
const BASE = "https://flm.fpt.edu.vn/gui/role/student";
const STORE_KEY = "flm.results";
const DELAY_MS = 700; // nghỉ giữa hai yêu cầu để không dồn tải lên FLM

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @type {Record<string, any>} mã môn -> kết quả đã lưu */
let results = {};
/** @type {Record<string, {state: string, note?: string}>} trạng thái hiển thị của lượt chạy hiện tại */
let live = {};
let order = [];
let running = false;
let stopRequested = false;

const parseCodes = (raw) =>
  [...new Set(raw.split(/[\s,;]+/).map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z0-9_.-]{3,20}$/.test(c)))];

async function loadSaved() {
  const data = await chrome.storage.local.get(STORE_KEY);
  results = data[STORE_KEY] || {};
  order = Object.keys(results).sort();
  order.forEach((c) => (live[c] = { state: results[c].status }));
}
const save = () => chrome.storage.local.set({ [STORE_KEY]: results });

async function fetchDoc(url) {
  let res;
  try {
    res = await fetch(url, { credentials: "include" });
  } catch {
    await sleep(1500); // mạng chập chờn: thử lại một lần
    res = await fetch(url, { credentials: "include" });
  }
  if (res.status === 403 || res.status === 503) throw new Error("FLM chặn yêu cầu (Cloudflare). Mở FLM ở một tab, vượt kiểm tra rồi chạy lại");
  if (!res.ok) throw new Error(`FLM trả mã ${res.status}`);
  return new DOMParser().parseFromString(await res.text(), "text/html");
}

async function crawlOne(code) {
  let search;
  try {
    search = FlmParser.parseSearch(await fetchDoc(`${BASE}/SyllabusManagement?searchOn=Code&keyword=${encodeURIComponent(code)}`), code);
  } catch (e) {
    if (e.message === "NOT_SEARCH_PAGE") throw new Error("Chưa đăng nhập FLM hoặc bị chặn: trang trả về không phải trang tìm kiếm");
    throw e;
  }
  if (!search.best) {
    return { code, status: "none", note: search.found ? `Có ${search.found} kết quả nhưng không mã nào trùng hẳn (${search.others.join(", ")})` : "FLM không có môn này", crawledAt: Date.now() };
  }
  await sleep(DELAY_MS);
  let detail;
  try {
    detail = FlmParser.parseDetail(await fetchDoc(`${BASE}/SyllabusDetails?sylID=${search.best.syllabusId}`));
  } catch (e) {
    if (e.message === "NOT_DETAIL_PAGE") throw new Error("Trang chi tiết syllabus không đúng định dạng (có thể FLM đã đổi giao diện)");
    throw e;
  }
  return {
    code,
    status: "ok",
    syllabusId: search.best.syllabusId,
    decision: search.best.decision,
    // các syllabus khác cùng mã (bản cũ) và mã gần giống bị bỏ qua, ghi lại để biết
    otherSyllabusIds: search.exact.slice(1).map((r) => r.syllabusId),
    ignoredSimilarCodes: search.others,
    ...detail,
    crawledAt: Date.now(),
  };
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
    cell(r && r.status === "ok" ? r.syllabusName : "");
    cell(r && r.status === "ok" ? String(r.chapters.length) : "", "num");
    cell(r && r.status === "ok" ? String(r.sessions.length) : "", "num");
    tbody.appendChild(tr);
  }
  const done = Object.values(results).filter((r) => r.status === "ok").length;
  $("download").disabled = $("copy").disabled = done === 0;
}

function setStatus(text, bad = false) {
  const el = $("status");
  el.textContent = text;
  el.className = "status" + (bad ? " bad" : "");
}

function exportJson() {
  const subjects = Object.values(results)
    .filter((r) => r.status === "ok")
    .sort((a, b) => a.code.localeCompare(b.code));
  return JSON.stringify({ source: "https://flm.fpt.edu.vn", exportedAt: new Date().toISOString(), subjects }, null, 2);
}

async function run() {
  const typed = parseCodes($("codes").value);
  if (typed.length === 0) return setStatus("Hãy nhập ít nhất một mã môn (ví dụ OSG202).", true);
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
  let fatal = false;
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
      const msg = e instanceof Error ? e.message : String(e);
      results[code] = { code, status: "err", note: msg, crawledAt: Date.now() };
      live[code] = { state: "err", note: msg };
      // Chưa đăng nhập / bị chặn thì các môn sau cũng hỏng: dừng sớm cho đỡ phí lượt
      if (/Chưa đăng nhập|chặn/.test(msg)) fatal = true;
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
  if (fatal) setStatus(results[todo.find((c) => results[c] && results[c].status === "err")].note, true);
  else setStatus(stopRequested ? `Đã dừng. Xong ${ok}/${todo.length} môn.` : `Hoàn tất: ${ok}/${todo.length} môn lấy được. Bấm “Tải JSON” để lưu.`);
}

$("start").addEventListener("click", () => void run());
$("stop").addEventListener("click", () => {
  stopRequested = true;
  setStatus("Đang dừng sau môn hiện tại…");
});
$("download").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([exportJson()], { type: "application/json" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `flm-syllabus-${new Date().toISOString().slice(0, 10)}.json` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
});
$("copy").addEventListener("click", async () => {
  await navigator.clipboard.writeText(exportJson());
  setStatus("Đã sao chép JSON vào clipboard.");
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

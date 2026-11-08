// Trang công cụ: lấy danh sách đề FE của từng môn trên FuOverflow (chỉ tên đề và thông tin mô tả, không tải ảnh).
// Gọi bằng phiên trình duyệt của bạn (host_permissions cho phép gửi cookie), phân tích bằng FuoParser, lưu kết quả vào chrome.storage.local để tải lại trang không mất.
//
// Chạy song song có kiểm soát để rút ngắn thời gian chờ:
//  - nhiều môn được lấy cùng lúc, và các trang page-2, page-3... của một môn cũng được tải cùng lúc (sau khi biết tổng số trang ở trang 1);
//  - mọi yêu cầu đi qua một bộ giới hạn chung: tối đa N yêu cầu đang chạy cùng lúc, hai yêu cầu bắt đầu cách nhau tối thiểu GAP_MS;
//  - bị FuOverflow báo quá tải (429/503) thì tự giảm một nửa số yêu cầu song song và thử lại có chờ; bị chặn hẳn (403, Cloudflare) thì dừng tất cả.
const BASE = "https://fuoverflow.com";
const STORE_KEY = "fuo.results";
const CONC_KEY = "fuo.concurrency";
const GAP_MS = 150; // hai yêu cầu bắt đầu cách nhau tối thiểu chừng này
const MAX_PAGES = 80; // chặn vòng lặp vô hạn nếu phân trang đọc sai
const MAX_CONCURRENCY = 6;
const FE_LABEL = "Đề Thi FE"; // chỉ giữ các bài có nhãn này (các nhãn khác như Đề Thi PE bị bỏ)

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @type {Record<string, any>} mã môn -> kết quả đã lưu */
let results = {};
let live = {};
let order = [];
let running = false;
let stopRequested = false;
let blockedMsg = null; // có giá trị khi bị chặn: dừng mọi việc đang chờ
let concurrency = 3;
let inflight = 0;
let lastStart = 0;

const parseCodes = (raw) => [...new Set(raw.split(/[\s,;]+/).map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z0-9]{2,12}$/.test(c)))];

async function loadSaved() {
  const data = await chrome.storage.local.get([STORE_KEY, CONC_KEY]);
  results = data[STORE_KEY] || {};
  order = Object.keys(results).sort();
  order.forEach((c) => (live[c] = { state: results[c].status }));
  concurrency = Math.min(MAX_CONCURRENCY, Math.max(1, Number(data[CONC_KEY]) || 3));
  $("parallel").value = String(concurrency);
}
// Nhiều môn xong cùng lúc: gộp các lần ghi để không ghi đè nhau liên tục
let saving = Promise.resolve();
const save = () => (saving = saving.then(() => chrome.storage.local.set({ [STORE_KEY]: results })));

class BlockedError extends Error {}
class StopError extends Error {}

// ---- Bộ giới hạn chung cho mọi yêu cầu
async function acquire() {
  for (;;) {
    if (stopRequested || blockedMsg) throw new StopError("STOP");
    if (inflight < concurrency) {
      const wait = lastStart + GAP_MS - Date.now();
      if (wait > 0) {
        await sleep(wait);
        continue; // kiểm tra lại sau khi chờ (có thể đã có yêu cầu khác chen vào)
      }
      inflight++;
      lastStart = Date.now();
      return;
    }
    await sleep(40);
  }
}
async function limited(fn) {
  await acquire();
  try {
    return await fn();
  } finally {
    inflight--;
  }
}
function slowDown() {
  const next = Math.max(1, Math.floor(concurrency / 2));
  if (next !== concurrency) {
    concurrency = next;
    $("parallel").value = String(concurrency);
    setStatus(`FuOverflow báo quá tải, đã giảm còn ${concurrency} yêu cầu song song và thử lại…`);
  }
}

/** Tải một trang và trả về { doc, url } (url cuối cùng sau khi chuyển hướng). null nếu 404. */
async function fetchDoc(url) {
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await limited(() => fetch(url, { credentials: "include" }));
    } catch (e) {
      if (e instanceof StopError) throw e;
      if (attempt >= 3) throw new Error("Không kết nối được tới FuOverflow");
      await sleep(1500 * attempt); // mạng chập chờn: thử lại
      continue;
    }
    if (res.status === 404 || res.status === 410) return null;
    if (res.status === 429 || res.status === 503) {
      slowDown();
      if (attempt >= 4) throw new BlockedError(`FuOverflow liên tục báo quá tải (mã ${res.status}). Hãy chờ một lúc rồi chạy lại, hoặc giảm số yêu cầu song song`);
      await sleep(3000 * attempt);
      continue;
    }
    if (res.status === 403) throw new BlockedError("FuOverflow chặn yêu cầu (mã 403). Mở FuOverflow ở một tab, vượt kiểm tra rồi chạy lại");
    if (!res.ok) throw new Error(`FuOverflow trả mã ${res.status}`);
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    if (FuoParser.looksBlocked(doc)) throw new BlockedError("FuOverflow hiện trang kiểm tra Cloudflare. Mở FuOverflow ở một tab, vượt kiểm tra rồi chạy lại");
    return { doc, url: res.url };
  }
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
  // Biết tổng số trang rồi thì tải các trang còn lại cùng lúc (số yêu cầu thật sự chạy cùng lúc vẫn do bộ giới hạn quyết định)
  const rest = [];
  for (let p = 2; p <= lastPage; p++) rest.push(fetchDoc(`${base}page-${p}`));
  const pages = await Promise.all(rest);
  for (const next of pages) {
    if (!next) continue;
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

  concurrency = Math.min(MAX_CONCURRENCY, Math.max(1, Number($("parallel").value) || 3));
  $("parallel").value = String(concurrency);
  void chrome.storage.local.set({ [CONC_KEY]: concurrency });
  running = true;
  stopRequested = false;
  blockedMsg = null;
  inflight = 0;
  $("start").disabled = true;
  $("stop").disabled = false;

  let next = 0;
  let finished = 0;
  // Mỗi worker lần lượt nhận một môn; số worker bằng số yêu cầu song song, còn tổng yêu cầu đang chạy do bộ giới hạn quyết định
  const worker = async () => {
    for (;;) {
      if (stopRequested || blockedMsg) return;
      const code = todo[next++];
      if (!code) return;
      live[code] = { state: "run" };
      render();
      try {
        results[code] = await crawlOne(code);
        live[code] = { state: results[code].status };
      } catch (e) {
        if (e instanceof StopError) {
          live[code] = { state: results[code] ? results[code].status : "wait" }; // dừng giữa chừng: không ghi lỗi, lần sau lấy tiếp
          return;
        }
        const msg = e instanceof Error ? e.message : String(e);
        results[code] = { code, status: "err", note: msg, crawledAt: Date.now() };
        live[code] = { state: "err", note: msg };
        if (e instanceof BlockedError) blockedMsg = msg; // bị chặn thì các môn sau cũng hỏng: dừng tất cả
      }
      finished++;
      await save();
      render();
      if (!blockedMsg) setStatus(`Đã xong ${finished}/${todo.length} môn (${concurrency} yêu cầu song song)…`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, worker));
  await saving;

  running = false;
  $("start").disabled = false;
  $("stop").disabled = true;
  render();
  const ok = todo.filter((c) => results[c] && results[c].status === "ok").length;
  if (blockedMsg) setStatus(blockedMsg, true);
  else setStatus(stopRequested ? `Đã dừng. Xong ${ok}/${todo.length} môn.` : `Hoàn tất: ${ok}/${todo.length} môn lấy được. Bấm “Tải JSON” để lưu.`);
}

$("start").addEventListener("click", () => void run());
$("stop").addEventListener("click", () => {
  stopRequested = true;
  setStatus("Đang dừng sau các yêu cầu đang chạy…");
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

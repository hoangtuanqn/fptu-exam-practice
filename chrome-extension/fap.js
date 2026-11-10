// Chạy trên fap.fpt.edu.vn: đọc Báo cáo điểm và Lịch thi của CHÍNH sinh viên đang đăng nhập (bằng phiên FAP của họ, ngay trong trang)
// rồi lưu vào bộ nhớ tiện ích. Chỉ làm khi sinh viên đã bật "Đồng bộ điểm FAP" ở trang Điểm FAP trên fepass.top.
// Tiện ích không gửi điểm đi đâu: website fepass.top (đang đăng nhập) lấy từ đây rồi tự gửi lên tài khoản của sinh viên.
//
// Thông báo nhỏ ở góc màn hình: bấm ✕ để ẩn 24 giờ (popup có công tắc để bật lại sớm). Khi sinh viên chủ động bấm
// "Đồng bộ ngay" ở popup thì luôn hiện tiến độ và lỗi, kể cả đang ẩn.
(() => {
  const DELAY_MS = 600; // nghỉ giữa hai yêu cầu để không dồn tải lên FAP
  const MIN_GAP_MS = 30 * 60 * 1000; // tự động đồng bộ tối đa 30 phút một lần (có nút đồng bộ lại)
  const MAX_TERMS = 8;
  const SUBJECT = /^[A-Za-z]{2,4}\d{3}[A-Za-z]?$/;
  const FINAL_STATUS = new Set(["passed", "failed"]);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const store = chrome.storage.local;

  // Mở bằng "Đồng bộ ngay" từ popup: địa chỉ có #fepass-sync, bỏ qua giới hạn 30 phút và luôn hiện thông báo
  let loud = location.hash === "#fepass-sync";
  if (loud) history.replaceState(null, "", location.pathname + location.search);

  // Popup gửi lệnh "fepass:sync"; trả lời khi trang đã khởi tạo xong
  let setTrigger;
  const triggerReady = new Promise((r) => (setTrigger = r));
  chrome.runtime.onMessage.addListener((m, _sender, sendResponse) => {
    if (!m || m.type !== "fepass:sync") return;
    triggerReady.then((trigger) => trigger()).then(sendResponse, () => sendResponse({ ok: false, reason: "error" }));
    return true; // trả lời bất đồng bộ
  });

  // ---- Trạng thái cho popup (tiến độ, kết quả, lỗi)
  const setState = (state) => store.set({ fapSync: { ...state, at: Date.now() } });

  // ---- Thông báo ở góc dưới: Shadow DOM để CSS của FAP không làm lệch giao diện
  let noticeUntil = 0;
  const noticeLoaded = store.get("fapNoticeUntil").then((v) => (noticeUntil = v.fapNoticeUntil || 0));
  chrome.storage.onChanged.addListener((c, area) => {
    if (area === "local" && c.fapNoticeUntil) noticeUntil = c.fapNoticeUntil.newValue || 0;
  });
  const muted = () => !loud && Date.now() < noticeUntil;

  const CSS = `
    :host { all: initial; }
    .box { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; width: 340px; max-width: calc(100vw - 32px); box-sizing: border-box;
      padding: 12px 14px; border-radius: 16px; border: 1px solid #f0d98a; background: #fffbe6; color: #2b1a04;
      font: 13px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; box-shadow: 0 10px 30px rgba(63,38,6,.25); animation: in .18s ease-out; }
    .box.error { background: #fff1f2; border-color: #fecdd3; }
    .box.ok { background: #f0fdf4; border-color: #bbf7d0; }
    .head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .head img { width: 20px; height: 20px; border-radius: 6px; }
    .head strong { font-size: 13px; color: #3f2606; }
    .x { margin-left: auto; width: 26px; height: 26px; border: 0; border-radius: 8px; background: transparent; color: #6b5d44; font-size: 16px; line-height: 1; cursor: pointer; }
    .x:hover { background: rgba(63,38,6,.1); }
    p { margin: 0; }
    .bar { height: 5px; margin-top: 8px; border-radius: 99px; background: #f3e3a8; overflow: hidden; }
    .bar i { display: block; height: 100%; background: #e29400; border-radius: 99px; transition: width .25s; }
    .bar.ind i { width: 40%; animation: ind 1.1s ease-in-out infinite; }
    .btns { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .btn { border: 0; border-radius: 999px; padding: 6px 12px; background: #ffc61f; color: #3f2606; font: 600 12px system-ui, sans-serif; text-decoration: none; cursor: pointer; }
    .btn.primary { background: #3f2606; color: #fff; }
    .btn:hover { filter: brightness(.95); }
    :focus-visible { outline: 2px solid #e29400; outline-offset: 2px; }
    @keyframes in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @keyframes ind { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }
    @media (prefers-reduced-motion: reduce) { .box, .bar.ind i { animation: none; } }
  `;

  let host = null;
  let shadow = null;
  let hideTimer = null;
  const ui = {
    hide() {
      clearTimeout(hideTimer);
      if (host) host.remove();
      host = shadow = null;
    },
    // tone: info | ok | error. progress: số 0..1, "ind" (chưa biết bao lâu) hoặc không đặt. buttons: { label, href | run, primary }
    show({ tone = "info", text, progress, buttons = [], autoHideMs = 0 }) {
      if (muted()) return;
      clearTimeout(hideTimer);
      if (!host) {
        host = document.createElement("div");
        host.id = "fepass-fap-banner";
        shadow = host.attachShadow({ mode: "open" });
        document.documentElement.appendChild(host);
      }
      const style = document.createElement("style");
      style.textContent = CSS;
      const box = document.createElement("div");
      box.className = `box ${tone}`;
      box.setAttribute("role", tone === "error" ? "alert" : "status");

      const head = document.createElement("div");
      head.className = "head";
      const logo = document.createElement("img");
      logo.src = chrome.runtime.getURL("icons/icon32.png");
      logo.alt = "";
      const name = document.createElement("strong");
      name.textContent = "FePass";
      const close = document.createElement("button");
      close.className = "x";
      close.type = "button";
      close.textContent = "✕";
      close.title = "Ẩn thông báo 24 giờ";
      close.setAttribute("aria-label", "Ẩn thông báo 24 giờ");
      close.addEventListener("click", () => {
        noticeUntil = Date.now() + FEPASS_SNOOZE_MS;
        store.set({ fapNoticeUntil: noticeUntil });
        ui.hide();
      });
      head.append(logo, name, close);

      const body = document.createElement("p");
      body.textContent = text;
      box.append(head, body);

      if (progress !== undefined) {
        const bar = document.createElement("div");
        bar.className = "bar" + (progress === "ind" ? " ind" : "");
        const fill = document.createElement("i");
        if (progress !== "ind") fill.style.width = `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`;
        bar.append(fill);
        box.append(bar);
      }
      if (buttons.length) {
        const row = document.createElement("div");
        row.className = "btns";
        for (const b of buttons) {
          const node = document.createElement(b.href ? "a" : "button");
          node.className = "btn" + (b.primary ? " primary" : "");
          node.textContent = b.label;
          if (b.href) Object.assign(node, { href: b.href, target: "_blank", rel: "noopener" });
          else {
            node.type = "button";
            node.addEventListener("click", b.run);
          }
          row.append(node);
        }
        box.append(row);
      }
      shadow.replaceChildren(style, box);
      if (autoHideMs) hideTimer = setTimeout(() => ui.hide(), autoHideMs);
    },
  };

  async function main() {
    await noticeLoaded; // biết đang ẩn thông báo hay không trước khi hiện gì
    const settings = await fepassGetSettings();
    const { gradeSync } = await store.get("gradeSync");
    const sync = !!(gradeSync && gradeSync.origin === settings.siteUrl && gradeSync.enabled);
    const siteLink = `${settings.siteUrl}/account/grades`;
    const kind = FapParser.pageKind(document);
    const onGrade = location.pathname.toLowerCase().startsWith("/report/grade");
    const openSite = { label: "Xem điểm cần đạt", href: siteLink, primary: true };

    // ---- Các trang không đọc điểm được: chỉ nhắc (khi đã bật đồng bộ) và báo lý do cho popup
    if (kind === "challenge") {
      const text = "FAP đang yêu cầu kiểm tra Cloudflare. Hãy hoàn thành bước kiểm tra, đăng nhập FAP bằng tài khoản của bạn, sau đó mở Báo cáo điểm để FePass đồng bộ.";
      if (sync) ui.show({ tone: "error", text });
      return () => ({ ok: false, reason: sync ? "challenge" : "off" });
    }
    if (kind === "schedule") {
      if (!sync) return () => ({ ok: false, reason: "off" });
      const readSchedule = async () => {
        const exams = FapParser.parseExamSchedule(document);
        const { fapGrades: old } = await store.get("fapGrades");
        await store.set({ fapGrades: { at: Date.now(), courses: old ? old.courses : [], exams } });
        await setState({ state: "done", message: `Đã đọc ${exams.length} buổi thi.`, exams: exams.length });
        ui.show({ tone: "ok", text: `Đã đọc ${exams.length} buổi thi. Mở fepass.top để xem lịch thi cùng điểm cần đạt của từng môn.`, buttons: [{ label: "Xem lịch thi", href: siteLink, primary: true }], autoHideMs: 12000 });
      };
      await readSchedule();
      return async () => {
        loud = true;
        await readSchedule();
        return { ok: true };
      };
    }
    if (kind !== "grade" || !onGrade) {
      // Trang đăng nhập (có ô mật khẩu) hoặc trang khác
      const needLogin = sync && !!document.querySelector("input[type=password]");
      if (needLogin) {
        ui.show({ tone: "info", text: "Hãy đăng nhập FAP. Sau khi đăng nhập, mở Báo cáo điểm để FePass đồng bộ điểm.", buttons: [{ label: "Mở Báo cáo điểm", href: FEPASS_GRADE_URL, primary: true }] });
      }
      return () => ({ ok: false, reason: !sync ? "off" : needLogin ? "login" : "not-grade" });
    }

    // ---- Trang Báo cáo điểm
    if (!sync) {
      ui.show({
        tone: "info",
        text: "Muốn FePass gợi ý điểm cần đạt cho từng môn? Bật “Đồng bộ điểm FAP” ở trang Điểm FAP trên fepass.top (bạn có thể tắt và xoá dữ liệu bất cứ lúc nào).",
        buttons: [{ label: "Bật trên FePass", href: siteLink, primary: true }],
      });
      return () => ({ ok: false, reason: "off" });
    }

    async function fetchDoc(url, want = "grade") {
      let res;
      try {
        res = await fetch(url, { credentials: "include" });
      } catch {
        await sleep(1500);
        res = await fetch(url, { credentials: "include" });
      }
      if (res.status === 403 || res.status === 503) throw new Error("FAP đang chặn bằng Cloudflare. Hãy tải lại trang, hoàn thành bước kiểm tra rồi thử lại.");
      if (!res.ok) throw new Error(`FAP trả mã ${res.status}`);
      const doc = new DOMParser().parseFromString(await res.text(), "text/html");
      const k = FapParser.pageKind(doc);
      if (k === "challenge") throw new Error("FAP đang yêu cầu kiểm tra Cloudflare. Hãy hoàn thành bước kiểm tra rồi thử lại.");
      if (k !== want) throw new Error("Phiên đăng nhập FAP đã hết. Hãy đăng nhập lại FAP rồi thử lại.");
      return doc;
    }

    const progress = (text, done, total) => {
      void setState({ state: "running", message: text, done, total });
      ui.show({ tone: "info", text, progress: total > 0 ? done / total : "ind" });
    };

    async function crawl() {
      const stored = (await store.get("fapGrades")).fapGrades;
      const known = new Map((stored ? stored.courses : []).map((c) => [c.courseId, c]));
      const terms = FapParser.parseTerms(document).slice(0, MAX_TERMS); // FAP xếp học kỳ mới nhất trước
      if (!terms.length) throw new Error("Không đọc được danh sách học kỳ (FAP có thể đã đổi giao diện).");
      const currentId = (terms.find((t) => t.selected) || terms[0]).id;

      let done = 0;
      let total = 0;
      const results = new Map();
      for (const term of terms) {
        const isLatest = term.id === terms[0].id;
        const termDoc = term.id === currentId && location.search.indexOf("courseId") < 0 ? document : await fetchDoc(`/Report/Grade?termId=${encodeURIComponent(term.id)}`);
        if (termDoc !== document) await sleep(DELAY_MS);
        const courses = FapParser.parseCourses(termDoc).filter((c) => c.termId === term.id || !c.termId);
        for (const c of courses) {
          total++;
          const cached = known.get(c.id);
          // Học kỳ cũ đã có kết quả cuối (qua/trượt) thì không cần lấy lại
          if (!isLatest && cached && FINAL_STATUS.has(cached.status)) {
            results.set(c.id, cached);
            done++;
            continue;
          }
          progress(`Đang đọc điểm ${term.name}: ${c.subjectCode || c.label} (${++done}/${total})…`, done, total);
          const doc = await fetchDoc(`/Report/Grade?termId=${encodeURIComponent(term.id)}&courseId=${encodeURIComponent(c.id)}`);
          const sheet = FapParser.parseSheet(doc);
          if (sheet) {
            const subjectCode = (sheet.subjectCode || c.subjectCode).toUpperCase();
            if (SUBJECT.test(subjectCode)) {
              results.set(c.id, {
                courseId: c.id,
                subjectCode,
                subjectName: sheet.subjectName || c.label,
                termName: sheet.termName || term.name,
                classCode: sheet.classCode || c.classCode,
                status: sheet.status,
                average: sheet.average,
                components: sheet.components,
              });
            }
          }
          await sleep(DELAY_MS);
        }
      }
      const courses = [...results.values()];

      // Lịch thi: lỗi ở bước này không làm mất điểm vừa đọc, lần sau đọc lại
      let exams = stored && stored.exams ? stored.exams : [];
      try {
        progress("Đang đọc lịch thi…", done, total);
        exams = FapParser.parseExamSchedule(await fetchDoc("/ExamSchedule", "schedule"));
      } catch {
        /* giữ lịch thi cũ */
      }
      await store.set({ fapGrades: { at: Date.now(), courses, exams } });
      return { courses: courses.length, exams: exams.length };
    }

    let running = false;
    async function run() {
      if (running) return;
      running = true;
      try {
        progress("Đang đọc điểm từ FAP…", 0, 0);
        const n = await crawl();
        await setState({ state: "done", message: `Đã đọc ${n.courses} môn.`, courses: n.courses, exams: n.exams });
        ui.show({
          tone: "ok",
          text: `Đã đọc ${n.courses} môn và ${n.exams} buổi thi. Mở fepass.top để hoàn tất đồng bộ (nếu trang Điểm FAP đang mở thì tự cập nhật).`,
          buttons: [openSite, { label: "Đồng bộ lại", run: () => void run() }],
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Không đọc được điểm.";
        await setState({ state: "error", message });
        ui.show({ tone: "error", text: message, buttons: [{ label: "Thử lại", run: () => void run(), primary: true }] });
      } finally {
        running = false;
      }
    }

    const { fapGrades } = await store.get("fapGrades");
    if (!loud && fapGrades && Date.now() - fapGrades.at < MIN_GAP_MS) {
      ui.show({ tone: "ok", text: `Điểm FAP đã đồng bộ lúc ${new Date(fapGrades.at).toLocaleTimeString("vi-VN")}.`, buttons: [openSite, { label: "Đồng bộ lại", run: () => void run() }], autoHideMs: 10000 });
    } else void run();

    return async () => {
      loud = true;
      void run();
      return { ok: true };
    };
  }

  main().then(setTrigger, () => setTrigger(() => ({ ok: false, reason: "error" })));
})();

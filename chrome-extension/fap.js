// Chạy trên fap.fpt.edu.vn: đọc Báo cáo điểm của CHÍNH sinh viên đang đăng nhập (bằng phiên FAP của họ, ngay trong trang)
// rồi lưu vào bộ nhớ tiện ích. Chỉ làm khi sinh viên đã bật "Đồng bộ điểm FAP" trong Hồ sơ trên fepass.top.
// Tiện ích không gửi điểm đi đâu: website fepass.top (đang đăng nhập) lấy từ đây rồi tự gửi lên tài khoản của sinh viên.
(async () => {
  const DELAY_MS = 600; // nghỉ giữa hai yêu cầu để không dồn tải lên FAP
  const MIN_GAP_MS = 30 * 60 * 1000; // tự động đồng bộ tối đa 30 phút một lần (có nút đồng bộ lại)
  const MAX_TERMS = 8;
  const SUBJECT = /^[A-Za-z]{2,4}\d{3}[A-Za-z]?$/;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const settings = await fepassGetSettings();
  if (!settings.enabled) return;
  const { gradeSync } = await chrome.storage.local.get("gradeSync");
  const sync = gradeSync && gradeSync.origin === settings.siteUrl && gradeSync.enabled ? gradeSync : null;
  const siteLink = `${settings.siteUrl}/account/grades`;

  // ---- Hộp thông báo nhỏ ở góc dưới
  let box = null;
  function show(message, { link, action } = {}) {
    if (!box) {
      box = document.createElement("div");
      box.id = "fepass-fap-banner";
      box.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:340px;padding:12px 14px;border-radius:12px;background:#1f2937;color:#fff;font:13px/1.45 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.3)";
      document.documentElement.appendChild(box);
    }
    box.textContent = "";
    const title = document.createElement("strong");
    title.textContent = "FePass";
    title.style.display = "block";
    const body = document.createElement("span");
    body.textContent = message;
    box.append(title, body);
    const addBtn = (label, onClick, href) => {
      const el = document.createElement(href ? "a" : "button");
      el.textContent = label;
      el.style.cssText = "display:inline-block;margin:8px 8px 0 0;padding:5px 10px;border:0;border-radius:8px;background:#f97316;color:#fff;font:600 12px system-ui,sans-serif;cursor:pointer;text-decoration:none";
      if (href) Object.assign(el, { href, target: "_blank", rel: "noopener" });
      else el.addEventListener("click", onClick);
      box.append(document.createElement("br"), el);
      return el;
    };
    if (link) addBtn(link.label, null, link.href);
    if (action) addBtn(action.label, action.run);
  }

  // ---- Trạng thái trang hiện tại
  const kind = FapParser.pageKind(document);
  const onGrade = location.pathname.toLowerCase().startsWith("/report/grade");

  if (kind === "challenge") {
    if (sync) show("FAP đang yêu cầu kiểm tra Cloudflare. Hãy hoàn thành bước kiểm tra, đăng nhập FAP bằng tài khoản của bạn, sau đó mở Báo cáo điểm để đồng bộ.");
    return;
  }
  if (kind !== "grade") {
    // Trang đăng nhập (có ô mật khẩu) hoặc trang khác
    if (sync && document.querySelector("input[type=password]")) {
      show("Hãy đăng nhập FAP. Sau khi đăng nhập, mở Báo cáo điểm để FePass đồng bộ điểm.", { link: { label: "Mở Báo cáo điểm", href: "https://fap.fpt.edu.vn/Report/Grade" } });
    }
    return;
  }
  if (!onGrade) return;
  if (!sync) {
    show("Muốn FePass gợi ý điểm cần đạt cho từng môn? Bật “Đồng bộ điểm FAP” trong Hồ sơ trên fepass.top (bạn có thể tắt và xoá dữ liệu bất cứ lúc nào).", { link: { label: "Bật đồng bộ điểm", href: siteLink } });
    return;
  }

  // ---- Đọc điểm
  async function fetchDoc(url) {
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
    if (k !== "grade") throw new Error("Phiên đăng nhập FAP đã hết. Hãy đăng nhập lại FAP rồi thử lại.");
    return doc;
  }

  const FINAL_STATUS = new Set(["passed", "failed"]);

  async function crawl() {
    const stored = (await chrome.storage.local.get("fapGrades")).fapGrades;
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
        show(`Đang đọc điểm ${term.name}: ${c.subjectCode || c.label} (${++done}/${total})…`);
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
    await chrome.storage.local.set({ fapGrades: { at: Date.now(), courses } });
    return courses.length;
  }

  let running = false;
  async function run() {
    if (running) return;
    running = true;
    try {
      show("Đang đọc điểm từ FAP…");
      const n = await crawl();
      show(`Đã đọc ${n} môn. Mở fepass.top để hoàn tất đồng bộ và xem điểm cần đạt cho từng môn.`, {
        link: { label: "Xem điểm cần đạt", href: siteLink },
        action: { label: "Đồng bộ lại", run },
      });
    } catch (e) {
      show(e instanceof Error ? e.message : "Không đọc được điểm.", { action: { label: "Thử lại", run } });
    } finally {
      running = false;
    }
  }

  const { fapGrades } = await chrome.storage.local.get("fapGrades");
  if (fapGrades && Date.now() - fapGrades.at < MIN_GAP_MS) {
    show(`Điểm FAP đã đồng bộ lúc ${new Date(fapGrades.at).toLocaleTimeString("vi-VN")}.`, { link: { label: "Xem điểm cần đạt", href: siteLink }, action: { label: "Đồng bộ lại", run } });
  } else run();
})();

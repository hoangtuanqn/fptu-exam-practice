// Phân tích trang Báo cáo điểm của FAP (fap.fpt.edu.vn/Report/Grade). Hàm thuần nhận Document đã parse, không gọi mạng.
// Trình duyệt tự giải mã các ký tự dạng &#x1EBF; khi parse HTML nên tiếng Việt đọc ra đúng.
(function (root) {
  const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const text = (el) => (el ? clean(el.textContent) : "");
  const CODE = /\(([A-Za-z]{2,4}\d{3}[A-Za-z]?)\)/;

  // "10,0" -> 10; "1.67" -> 1.67; "-" hoặc rỗng -> null
  function num(raw) {
    const t = clean(raw).replace("%", "").replace(",", ".");
    if (!t || t === "-") return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  function parseTerms(doc) {
    return [...doc.querySelectorAll("#grade-report-term option")].map((o) => ({ id: o.value, name: text(o), selected: o.hasAttribute("selected") }));
  }

  // Các môn trong học kỳ đang chọn: "Computer Networking (NWC204) (SE2113)" -> mã môn NWC204, lớp SE2113
  function parseCourses(doc) {
    return [...doc.querySelectorAll("#grade-report-course option")].map((o) => {
      const label = text(o);
      const m = label.match(CODE);
      const rest = m ? label.slice(label.indexOf(m[0]) + m[0].length) : "";
      const cls = rest.match(/\(([^)]+)\)/);
      return { id: o.value, termId: o.getAttribute("data-report-term-id") || "", label, subjectCode: m ? m[1].toUpperCase() : "", classCode: cls ? cls[1] : "", selected: o.hasAttribute("selected") };
    });
  }

  // Bảng điểm của một môn (thẻ .fap-result-card); null nếu trang chưa có bảng (chưa có môn nào)
  function parseSheet(doc) {
    const card = doc.querySelector(".fap-result-card");
    const table = card && card.querySelector("table.student-mark-sheet");
    if (!card || !table) return null;
    const titleEl = card.querySelector(".fap-result-card__title");
    const codeEl = card.querySelector(".fap-result-card__code");
    const subjectCode = text(codeEl).toUpperCase();
    const subjectName = clean([...titleEl.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(" "));
    const meta = [...card.querySelectorAll(".fap-result-card__meta span")].map(text);

    const components = [];
    let group = "";
    let status = "unknown";
    let average = null;
    for (const tr of table.querySelectorAll("tbody tr")) {
      const cls = tr.className || "";
      if (cls.includes("sheet-row-total")) continue; // dòng "Tổng" của nhóm: tự tính lại từ từng cột điểm
      if (cls.includes("sheet-grand-total")) {
        const avg = tr.querySelector(".grade-average");
        if (avg) average = num(avg.textContent);
        const st = tr.querySelector(".grade-status");
        if (st) status = /passed/.test(st.className) ? "passed" : /failed/.test(st.className) ? "failed" : /studying/.test(st.className) ? "studying" : "unknown";
        continue;
      }
      const tds = [...tr.children];
      if (tds[0] && tds[0].classList.contains("sheet-group-cell")) group = text(tds.shift());
      if (tds.length < 3) continue;
      const weight = num(tds[1].textContent);
      if (weight === null) continue;
      components.push({ group, name: text(tds[0]), weight, score: num(tds[2].textContent) });
    }
    return { subjectCode, subjectName, classCode: meta[0] || "", termName: meta[1] || "", status, average, components };
  }

  // Trang chặn của Cloudflare (chưa vượt kiểm tra) hay chưa đăng nhập FAP
  function pageKind(doc) {
    if (doc.querySelector("#grade-report-term")) return "grade";
    const title = text(doc.querySelector("title")).toLowerCase();
    if (title.includes("just a moment") || title.includes("attention required") || doc.querySelector("#challenge-form, #cf-challenge-running, .cf-browser-verification")) return "challenge";
    return "other"; // thường là trang đăng nhập
  }

  root.FapParser = { parseTerms, parseCourses, parseSheet, pageKind, num };
})(typeof window !== "undefined" ? window : globalThis);

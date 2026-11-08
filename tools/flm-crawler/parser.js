// Phân tích HTML của FLM (flm.fpt.edu.vn). Hàm thuần, nhận Document đã parse, không gọi mạng: dễ kiểm thử với file HTML lưu sẵn.
(function (root) {
  const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const text = (el) => (el ? clean(el.textContent) : "");

  // Các dòng của một ô (<br> là xuống dòng)
  function lines(el) {
    if (!el) return [];
    const c = el.cloneNode(true);
    c.querySelectorAll("br").forEach((b) => b.replaceWith("\n"));
    return c.textContent.split("\n").map(clean).filter(Boolean);
  }

  // Bảng bất kỳ có hàng tiêu đề (th) -> mảng đối tượng theo tên cột
  function tableRows(table) {
    if (!table) return [];
    const heads = [...table.querySelectorAll("thead th")].map(text);
    return [...table.querySelectorAll("tbody tr")].map((tr) => {
      const row = {};
      [...tr.children].forEach((td, i) => {
        row[heads[i] || `col${i}`] = lines(td).join("\n");
      });
      return row;
    });
  }

  // Kết quả tìm kiếm môn: chỉ giữ dòng có Subject Code TRÙNG HẲN từ khóa (OSG202 không lấy OSG202c, OSG202b).
  // Nhiều syllabus cùng mã thì ưu tiên bản đang dùng và đã duyệt, rồi tới quyết định mới nhất.
  function parseSearch(doc, keyword) {
    if (!doc.querySelector("#txtSubCode")) throw new Error("NOT_SEARCH_PAGE");
    const want = clean(keyword).toUpperCase();
    const rows = [...doc.querySelectorAll("#gvSyllabus tbody tr")].map((tr) => {
      const td = tr.querySelectorAll("td");
      const href = td[3] && td[3].querySelector("a") ? td[3].querySelector("a").getAttribute("href") || "" : "";
      const m = href.match(/sylID=(\d+)/);
      const decision = text(td[6]);
      const d = decision.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); // MM/dd/yyyy
      return {
        syllabusId: m ? m[1] : text(td[0]),
        code: text(td[1]),
        subjectName: text(td[2]),
        syllabusName: text(td[3]),
        active: !!(td[4] && td[4].querySelector("input[checked]")),
        approved: !!(td[5] && td[5].querySelector("input[checked]")),
        decision,
        decisionTime: d ? Date.UTC(+d[3], +d[1] - 1, +d[2]) : 0,
      };
    });
    const exact = rows.filter((r) => r.code.toUpperCase() === want && r.syllabusId);
    exact.sort((a, b) => Number(b.active && b.approved) - Number(a.active && a.approved) || b.decisionTime - a.decisionTime || Number(b.syllabusId) - Number(a.syllabusId));
    return { found: rows.length, exact, best: exact[0] || null, others: rows.filter((r) => !exact.includes(r)).map((r) => r.code) };
  }

  // "Chapter 3: Memory management" mở chương mới (bắt buộc có dấu : . - sau số chương)
  const CHAPTER_HEAD = /^(?:chapter|chương|unit|lesson|part)\s*(\d+)\s*[:.\-–]\s*(.+)$/i;
  // "Chapter 3 Problems", "Chapter 7, 10 Presentation": chỉ nhắc tới chương, không đặt tên
  const CHAPTER_REF = /^(?:chapter|chương|unit|lesson|part)\s*(\d+)/i;

  // Gom các buổi học thành chương: dòng "Chapter N: Tên" mở chương; "N.M ..." và "Chapter N ..." thuộc chương N; dòng khác (Review, Progress Test...) thuộc chương đang mở
  function deriveChapters(sessions) {
    const chapters = [];
    let cur = null;
    const byNum = (n) => chapters.find((c) => c.number === n);
    const open = (number, title) => {
      let c = number != null ? byNum(number) : null;
      if (!c) {
        c = { number, title: clean(title), sessions: [], topics: [] };
        chapters.push(c);
      }
      return c;
    };
    for (const s of sessions) {
      for (const line of s.topicLines) {
        const head = line.match(CHAPTER_HEAD);
        const ref = line.match(CHAPTER_REF);
        const sub = line.match(/^(\d+)\.(\d+)/);
        if (head) cur = open(Number(head[1]), head[2]);
        else if (ref && byNum(Number(ref[1]))) cur = byNum(Number(ref[1]));
        else if (sub && byNum(Number(sub[1]))) cur = byNum(Number(sub[1]));
        else if (sub) cur = open(Number(sub[1]), "");
        else if (!cur) cur = open(null, "Khác");
        if (!cur.sessions.includes(s.no)) cur.sessions.push(s.no);
        cur.topics.push(line);
      }
    }
    return chapters;
  }

  function parseDetail(doc) {
    const info = {};
    const infoTable = doc.querySelector("#table-detail");
    if (!infoTable) throw new Error("NOT_DETAIL_PAGE");
    infoTable.querySelectorAll("tr").forEach((tr) => {
      const td = tr.querySelectorAll("td");
      if (td.length >= 2) info[text(td[0]).replace(/:$/, "")] = lines(td[1]).join("\n");
    });

    const sessions = tableRows(doc.querySelector("#gvSchedule")).map((r) => ({
      no: clean(r["Session"]),
      topicLines: (r["Topic"] || "").split("\n").map(clean).filter(Boolean),
      type: clean(r["Learning-Teaching Type"]),
      lo: clean(r["LO"]),
      itu: clean(r["ITU"]),
      materials: (r["Student Materials"] || "").split("\n").map(clean).filter(Boolean),
      tasks: (r["Student's Tasks"] || "").split("\n").map(clean).filter(Boolean),
    }));

    return {
      syllabusId: info["Syllabus ID"] || "",
      subjectCode: info["Subject Code"] || "",
      syllabusName: info["Syllabus Name"] || "",
      courseNameEn: info["Course Name English"] || "",
      credits: info["NoCredit"] || "",
      prerequisite: info["Pre-Requisite"] || "",
      description: info["Description"] || "",
      info,
      clos: tableRows(doc.querySelector("#gvLO")).map((r) => ({ name: clean(r["CLO Name"]), details: clean(r["CLO Details"]) })),
      chapters: deriveChapters(sessions),
      sessions,
      assessments: tableRows(doc.querySelector("#gvAssessment")),
      materials: tableRows(doc.querySelector("#gvMaterial")),
    };
  }

  root.FlmParser = { parseSearch, parseDetail, deriveChapters };
})(typeof window !== "undefined" ? window : globalThis);

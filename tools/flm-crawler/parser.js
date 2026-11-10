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

  // Kết quả tìm kiếm môn. `exact` / `best`: chỉ dòng có Subject Code TRÙNG HẲN từ khóa (OSG202 không lấy OSG202c).
  // `matches`: mỗi mã trùng hẳn hoặc có thêm tối đa 2 chữ cái ở cuối (ADA201 -> ADA201, ADA201c, ADA201cm), kèm syllabus tốt nhất của từng mã.
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
    const newest = (a, b) => Number(b.active && b.approved) - Number(a.active && a.approved) || b.decisionTime - a.decisionTime || Number(b.syllabusId) - Number(a.syllabusId);
    const exact = rows.filter((r) => r.code.toUpperCase() === want && r.syllabusId);
    exact.sort(newest);
    // Mã có thêm 0 đến 2 chữ cái ở cuối (không nhận thêm chữ số: ADA2011 là môn khác)
    const near = rows.filter((r) => r.syllabusId && r.code.toUpperCase().startsWith(want) && /^[A-Z]{0,2}$/.test(r.code.toUpperCase().slice(want.length)));
    const byCode = new Map();
    for (const r of near) byCode.set(r.code.toUpperCase(), [...(byCode.get(r.code.toUpperCase()) || []), r]);
    const matches = [...byCode.entries()]
      .map(([code, list]) => ({ code, best: list.sort(newest)[0] }))
      .sort((a, b) => a.code.length - b.code.length || a.code.localeCompare(b.code));
    return { found: rows.length, exact, best: exact[0] || null, matches, others: rows.filter((r) => !exact.includes(r)).map((r) => r.code) };
  }

  // "Chapter 3: Memory management" mở chương mới (bắt buộc có dấu : . - sau số chương)
  const CHAPTER_HEAD = /^(?:chapter|chương|unit|lesson|part)\s*(\d+)\s*[:.\-–]\s*(.+)$/i;
  // "Chapter 3 Problems", "Chapter 7, 10 Presentation": chỉ nhắc tới chương, không đặt tên
  const CHAPTER_REF = /^(?:chapter|chương|unit|lesson|part)\s*(\d+)/i;
  // "Chương I: Tên", "Part II - Tên": số La Mã viết hoa, bắt buộc có dấu : . - ngay sau số (để không nhầm với "Unit Cost ...")
  const ROMAN_HEAD = /^(?:chapter|chương|unit|lesson|part)\s+([ivxlc]+)\s*[:.\-–]\s*(.+)$/i;
  // "2. Numbering systems", "3.Data storage": dòng tên chương không có chữ "Chapter" (nhận cả "1.Tên" không dấu cách). Không nhận "2.1 ..." (mục con).
  // Chỉ coi là tên chương khi môn có mục con "N.x" của đúng chương đó (hoặc cả môn chỉ gồm các dòng "N. Tên" với từ 3 số chương khác nhau), để không nhầm với danh sách đánh số bình thường.
  const NUM_HEAD = /^(\d+)\s*[.:)]\s*(?!\d)(\S.*)$/;
  const romanToInt = (r) => {
    const v = { I: 1, V: 5, X: 10, L: 50, C: 100 };
    let n = 0;
    for (let i = 0; i < r.length; i++) n += v[r[i]] < (v[r[i + 1]] || 0) ? -v[r[i]] : v[r[i]];
    return n;
  };

  // Gom các buổi học thành chương: dòng "Chapter N: Tên" mở chương; "N.M ..." và "Chapter N ..." thuộc chương N; dòng khác (Review, Progress Test...) thuộc chương đang mở
  function deriveChapters(sessions) {
    const chapters = [];
    let cur = null;
    const byNum = (n) => chapters.find((c) => c.number === n);
    const open = (number, title) => {
      let c = number != null ? byNum(number) : null;
      if (!c) {
        c = { number, title: clean(title), topics: [] };
        chapters.push(c);
      } else if (!c.title && title) c.title = clean(title); // chương đã mở từ mục con "N.M" nhưng chưa có tên: nhận tên từ dòng tiêu đề
      return c;
    };
    // Các số chương có mục con "N.M ...": chỉ những chương này mới nhận dòng "N. Tên" làm tên chương
    const withSubItems = new Set();
    for (const s of sessions) for (const line of s.topicLines) if (/^\d+\.\d/.test(line)) withSubItems.add(Number(line.match(/^(\d+)/)[1]));
    // Môn chỉ liệt kê "1. Tên", "2. Tên", ... (không có mục con "N.M"): mỗi dòng là một chương, miễn là có từ 3 số chương khác nhau trở lên
    const headNumbers = new Set();
    for (const s of sessions) for (const line of s.topicLines) if (!/^\d+\.\d/.test(line) && NUM_HEAD.test(line)) headNumbers.add(Number(line.match(NUM_HEAD)[1]));
    const headsOnly = withSubItems.size === 0 && headNumbers.size >= 3;
    for (const s of sessions) {
      for (const line of s.topicLines) {
        const head = line.match(CHAPTER_HEAD);
        const romanMatch = line.match(ROMAN_HEAD);
        const roman = romanMatch && romanMatch[1] === romanMatch[1].toUpperCase() ? romanMatch : null; // chỉ nhận số La Mã viết hoa
        const numHead = line.match(NUM_HEAD);
        const ref = line.match(CHAPTER_REF);
        const sub = line.match(/^(\d+)\.(\d+)/);
        if (roman) {
          cur = open(romanToInt(roman[1]), roman[2]);
          continue;
        }
        if (!head && numHead && (headsOnly || withSubItems.has(Number(numHead[1])))) {
          cur = open(Number(numHead[1]), numHead[2]); // dòng tên chương: không giữ làm chủ đề
          continue;
        }
        if (head) cur = open(Number(head[1]), head[2]);
        else if (ref && byNum(Number(ref[1]))) cur = byNum(Number(ref[1]));
        else if (sub && byNum(Number(sub[1]))) cur = byNum(Number(sub[1]));
        else if (sub) cur = open(Number(sub[1]), "");
        else if (!cur) cur = open(null, "Khác");
        if (!cur.topics.includes(line)) cur.topics.push(line); // nhiều buổi lặp lại “Chapter 2 Problems”: chỉ giữ một
      }
    }
    // Chỉ giữ các mục nội dung có đánh số ("1.1 ...", "2.3. ..."); bỏ dòng tên chương, "Chapter N Problems", bài Lab, Review, Progress Test.
    // Chương nào không có mục đánh số thì giữ các dòng còn lại (trừ dòng tên chương) để không bị trống.
    for (const c of chapters) {
      const numbered = c.topics.filter((t) => /^\d+\.\d+/.test(t));
      c.topics = numbered.length ? numbered : c.topics.filter((t) => !CHAPTER_HEAD.test(t) && !CHAPTER_REF.test(t));
    }
    // Mục "Khác" (không có số chương) chỉ chứa các dòng nằm trước chương đầu tiên, ví dụ "Introduction to the Course": không phải một chương.
    // Môn đã có chương đánh số thì bỏ nó đi; môn không chia được chương thì vẫn giữ để không mất các chủ đề.
    return chapters.some((c) => c.number != null && c.number > 0) ? chapters.filter((c) => c.number != null) : chapters;
  }

  // Số đầu tiên trong cột Completion Criteria (">=4" -> 4, ">0" -> 0); không có số thì null
  const minScoreOf = (criteria) => {
    const m = String(criteria || "").match(/(\d+(?:[.,]\d+)?)/);
    return m ? Number(m[1].replace(",", ".")) : null;
  };

  // Bảng Assessment của syllabus: loại điểm, trọng số (%) và điểm tối thiểu của từng phần
  function parseAssessments(doc) {
    return tableRows(doc.querySelector("#gvAssessment"))
      .map((r) => {
        const w = clean(r["Weight"]).match(/(\d+(?:[.,]\d+)?)\s*%/);
        return { category: clean(r["Category"]), weight: w ? Number(w[1].replace(",", ".")) : null, minScore: minScoreOf(r["Completion Criteria"]) };
      })
      .filter((a) => a.category);
  }

  // Chỉ lấy phần cần dùng: mã môn, tên môn, và các chương kèm chủ đề (suy ra từ cột Topic của lịch học)
  function parseDetail(doc) {
    const info = {};
    const infoTable = doc.querySelector("#table-detail");
    if (!infoTable) throw new Error("NOT_DETAIL_PAGE");
    infoTable.querySelectorAll("tr").forEach((tr) => {
      const td = tr.querySelectorAll("td");
      if (td.length >= 2) info[text(td[0]).replace(/:$/, "")] = lines(td[1]).join("\n");
    });
    const sessions = tableRows(doc.querySelector("#gvSchedule")).map((r) => ({
      topicLines: (r["Topic"] || "").split("\n").map(clean).filter(Boolean),
    }));
    return {
      subjectCode: info["Subject Code"] || "",
      subjectName: info["Course Name English"] || info["Syllabus Name"] || "",
      chapters: deriveChapters(sessions),
      // Điểm trung bình tối thiểu để qua môn (null nếu syllabus không ghi) và các phần đánh giá
      minAvgMarkToPass: (() => {
        const n = parseFloat(String(info["MinAvgMarkToPass"] || "").replace(",", "."));
        return Number.isFinite(n) ? n : null;
      })(),
      assessments: parseAssessments(doc),
      credits: (() => {
        const n = parseInt(info["NoCredit"] || info["No Credit"] || "", 10);
        return Number.isFinite(n) && n >= 0 && n < 30 ? n : null;
      })(),
    };
  }

  root.FlmParser = { parseSearch, parseDetail, deriveChapters };
})(typeof window !== "undefined" ? window : globalThis);

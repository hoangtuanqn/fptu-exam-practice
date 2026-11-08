// Bộ phân tích trang danh sách bài của một môn trên FuOverflow (XenForo): /forums/<mã môn>/ và các trang page-2, page-3...
// Cùng cách đọc với backend (services/crawler/fuo-catalog.service.ts) nhưng dùng DOM của trình duyệt. FuOverflow đổi giao diện thì chỉ cần sửa file này.
const FuoParser = (() => {
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const THREAD_ID = /\/threads\/(?:[^/]*\.)?(\d{1,18})(?:\/|$)/;

  /** Các bài trong một trang danh sách + số trang lớn nhất ở thanh phân trang. */
  function parseForumPage(doc) {
    const threads = [];
    doc.querySelectorAll(".structItem--thread").forEach((el) => {
      const links = el.querySelectorAll(".structItem-title > a[href*='/threads/']");
      const a = links[links.length - 1];
      if (!a) return;
      const id = (a.getAttribute("href") || "").match(THREAD_ID)?.[1];
      const title = clean(a.textContent);
      if (!id || !title) return;
      const meta = el.querySelector(".structItem-cell--meta dd");
      const time = el.querySelector(".structItem-startDate time");
      const iso = time && time.getAttribute("datetime");
      const date = iso ? new Date(iso) : null;
      threads.push({
        threadId: id,
        title,
        prefix: clean(el.querySelector(".structItem-title .label")?.textContent),
        postedAt: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
        replies: Number(clean(meta && meta.textContent).replace(/\D/g, "")) || 0,
      });
    });
    let lastPage = 1;
    doc.querySelectorAll(".pageNav-main a").forEach((a) => {
      const n = Number((a.getAttribute("href") || "").match(/page-(\d+)/)?.[1] ?? clean(a.textContent));
      if (Number.isInteger(n) && n > lastPage) lastPage = n;
    });
    return { threads, lastPage };
  }

  /** Trang chặn của Cloudflare ("Just a moment...") hoặc trang đăng nhập thay cho trang danh sách. */
  function looksBlocked(doc) {
    const title = clean(doc.title).toLowerCase();
    return title.includes("just a moment") || title.includes("attention required") || !!doc.querySelector("#challenge-form, .cf-error-details");
  }

  return { parseForumPage, looksBlocked };
})();

// Chạy trên fuoverflow.com: thêm nút “Làm đề thi trên fepass.top” cạnh các bài có nhãn “Đề Thi FE”,
// cả ở danh sách bài (/forums/...) lẫn trang chi tiết bài (/threads/...).
// Nút chỉ là một liên kết sang fepass.top; việc xác nhận và trừ credit diễn ra trên fepass.top.
// Chưa đăng nhập fepass.top thì hiện hộp thoại mời đăng nhập (trạng thái do site.js ghi lại khi người dùng ở fepass.top).
(() => {
  // Nhãn -> loại: FE là đề ảnh (làm trên fepass.top), PE là bộ tài nguyên (tải file zip)
  const LABELS = { fe: "Đề Thi FE", pe: "Đề Thi PE" };
  const MARK = "data-fepass";
  const DISMISS_KEY = "fepass_login_prompt_dismissed";

  const norm = (s) => String(s || "").normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
  const kindOfLabels = (root) => {
    const texts = [...root.querySelectorAll(".label, .labelLink")].map((el) => norm(el.textContent));
    return texts.includes(norm(LABELS.fe)) ? "fe" : texts.includes(norm(LABELS.pe)) ? "pe" : null;
  };

  // /threads/osg202-su26-re.7168/page-2?x=1  ->  https://fuoverflow.com/threads/osg202-su26-re.7168/
  function threadUrlOf(href) {
    try {
      const u = new URL(href, location.href);
      const m = u.pathname.match(/^\/threads\/([^/]+)\/?/);
      return m && /(^|\.)\d+$/.test(m[1]) ? `${u.origin}/threads/${m[1]}/` : null;
    } catch {
      return null;
    }
  }

  let settings = null;
  let auth = { loggedIn: false, name: "" };
  let price = null; // phí lấy đề FE (credit), null = chưa biết
  let pePrice = null; // phí tải đề PE

  const targetOf = (threadUrl, kind) => `${settings.siteUrl}${kind === "pe" ? "/account/pe" : "/"}?${new URLSearchParams({ link: threadUrl, confirm: "1", src: "ext" })}`;
  const priceOf = (kind) => (kind === "pe" ? pePrice : price);
  const priceText = (kind) => { const p = priceOf(kind); return p === null ? "" : p > 0 ? `${p.toLocaleString("vi-VN")}đ` : "Miễn phí"; };

  // ---------------------------------------------------------------- hộp thoại mời đăng nhập (Shadow DOM: không đụng CSS của FuOverflow)
  let modal = null; // { host, render }

  const MODAL_CSS = `
    :host { all: initial; }
    .ov { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center; padding: 16px;
      background: rgba(11,23,48,.45); backdrop-filter: blur(3px); font: 14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; }
    .box { width: 100%; max-width: 400px; background: #fff; color: #101010; border-radius: 20px; padding: 24px; box-shadow: 0 24px 60px rgba(11,23,48,.35);
      animation: pop .22s cubic-bezier(.2,.9,.3,1.2) both; text-align: center; }
    @keyframes pop { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .box { animation: none; } }
    img { width: 64px; height: 64px; border-radius: 16px; }
    h2 { margin: 12px 0 6px; font-size: 18px; color: #0b1730; }
    p { margin: 0; color: #475569; }
    .steps { margin: 14px 0 4px; padding: 10px 14px; text-align: left; background: #f6f8fc; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 13px; color: #334155; }
    .steps ol { margin: 0; padding-left: 18px; }
    .btns { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
    a.btn, button.btn { display: block; width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid transparent; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none; text-align: center; }
    .primary { background: #0b1730; color: #fff; } .primary:hover { background: #10265a; }
    .second { background: #fff; color: #0b1730; border-color: #cbd5e1; } .second:hover { background: #f1f5f9; }
    .link { background: none; border: 0; color: #64748b; font-size: 13px; cursor: pointer; margin-top: 2px; padding: 6px; }
    .ok { color: #047857; font-weight: 600; }
  `;

  function closeModal() {
    if (modal) {
      modal.cleanup();
      modal.host.remove();
    }
    modal = null;
  }

  // pending: liên kết fepass người dùng vừa bấm (để sau khi đăng nhập có thể đi tiếp ngay)
  function showLoginModal(pending) {
    if (modal) return;
    const host = document.createElement("div");
    host.setAttribute(MARK, "modal");
    const root = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = MODAL_CSS;
    const ov = document.createElement("div");
    ov.className = "ov";
    ov.addEventListener("mousedown", (e) => e.target === ov && dismiss());
    root.append(style, ov);

    const dismiss = () => {
      try {
        sessionStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* bỏ qua */
      }
      closeModal();
    };
    const onKey = (e) => e.key === "Escape" && dismiss();
    document.addEventListener("keydown", onKey);

    const icon = () => {
      const i = document.createElement("img");
      i.src = chrome.runtime.getURL("icons/icon128.png");
      i.alt = "";
      return i;
    };
    const el = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text) n.textContent = text;
      return n;
    };
    const link = (cls, text, href) => {
      const a = el("a", `btn ${cls}`, text);
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener";
      return a;
    };

    const renderPrompt = () => {
      const box = el("div", "box");
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-modal", "true");
      const steps = el("div", "steps");
      const ol = el("ol");
      ["Đăng nhập (hoặc tạo tài khoản miễn phí) tại fepass.top", "Quay lại FuOverflow này, bấm “Làm đề thi trên fepass.top”", "Xác nhận để lấy đề"].forEach((t) => ol.append(el("li", "", t)));
      steps.append(ol);
      const btns = el("div", "btns");
      btns.append(link("primary", "Đăng nhập fepass.top", `${settings.siteUrl}/login`), link("second", "Tạo tài khoản miễn phí", `${settings.siteUrl}/register`));
      const later = el("button", "link", "Để sau");
      later.type = "button";
      later.addEventListener("click", dismiss);
      box.append(icon(), el("h2", "", "Đăng nhập fepass.top để làm đề"), el("p", "", "Bạn cần có tài khoản fepass.top trước khi lấy và làm đề ngay từ FuOverflow."), steps, btns, later);
      ov.replaceChildren(box);
    };

    const renderConnected = () => {
      const box = el("div", "box");
      box.setAttribute("role", "dialog");
      const btns = el("div", "btns");
      if (pending) btns.append(link("primary", "Tiếp tục làm đề", pending));
      const close = el("button", pending ? "link" : "btn primary", pending ? "Đóng" : "Xong");
      close.type = "button";
      close.addEventListener("click", closeModal);
      btns.append(close);
      box.append(icon(), el("h2", "", "Đã kết nối fepass.top"), el("p", "ok", auth.name ? `Xin chào ${auth.name}!` : "Tài khoản của bạn đã sẵn sàng."), btns);
      ov.replaceChildren(box);
    };

    document.documentElement.append(host);
    modal = {
      host,
      render: () => (auth.loggedIn ? renderConnected() : renderPrompt()),
      cleanup: () => document.removeEventListener("keydown", onKey),
    };
    modal.render();
  }

  // ---------------------------------------------------------------- nút trên trang
  function makeButton(threadUrl, big, kind) {
    const a = document.createElement("a");
    a.className = "fepass-btn" + (big ? " fepass-btn--lg" : "");
    a.setAttribute(MARK, "1");
    a.href = targetOf(threadUrl, kind);
    a.dataset.kind = kind;
    a.target = "_blank";
    a.rel = "noopener";
    a.title = "Mở đề này trên fepass.top. Bạn sẽ được hỏi xác nhận trước khi bị trừ credit.";

    const icon = document.createElement("img");
    icon.src = chrome.runtime.getURL("icons/icon32.png");
    icon.alt = "";
    icon.width = icon.height = big ? 22 : 18;

    const text = document.createElement("span");
    text.className = "fepass-btn__text";
    text.textContent = kind === "pe" ? "Tải đề PE" : "Làm đề";

    const cost = document.createElement("em");
    cost.className = "fepass-btn__price";
    cost.textContent = priceText(kind);
    cost.hidden = priceOf(kind) === null;

    a.append(icon, text, cost);
    a.addEventListener("click", (e) => {
      e.stopPropagation(); // bản thân tiêu đề cũng là liên kết
      if (!auth.loggedIn) {
        e.preventDefault(); // chưa có tài khoản fepass.top: mời đăng nhập thay vì đi tiếp
        showLoginModal(a.href);
      }
    });
    return a;
  }

  function scan() {
    if (!settings || !settings.enabled) return;

    // Danh sách bài: mỗi dòng .structItem-title chứa nhãn (.label / .labelLink) và liên kết tiêu đề
    document.querySelectorAll(".structItem--thread .structItem-title").forEach((box) => {
      if (box.hasAttribute(MARK)) return;
      const kind = kindOfLabels(box);
      if (!kind) return;
      const link = [...box.querySelectorAll('a[href*="/threads/"]')].find((a) => !a.classList.contains("labelLink") && threadUrlOf(a.href));
      if (!link) return;
      box.setAttribute(MARK, "1");
      link.after(makeButton(threadUrlOf(link.href), false, kind));
    });

    // Trang chi tiết bài: nhãn nằm trong h1 tiêu đề
    const h1 = document.querySelector("h1.p-title-value");
    const h1kind = h1 ? kindOfLabels(h1) : null;
    if (h1 && !h1.hasAttribute(MARK) && h1kind) {
      const url = threadUrlOf(location.href);
      if (url) {
        h1.setAttribute(MARK, "1");
        const wrap = document.createElement("div");
        wrap.className = "fepass-bar";
        wrap.setAttribute(MARK, "1");
        wrap.append(makeButton(url, true, h1kind));
        (h1.closest(".p-title") || h1).after(wrap);
      }
    }
    maybePrompt();
  }

  function removeAll() {
    document.querySelectorAll(`[${MARK}]`).forEach((el) => (el.classList.contains("fepass-btn") || el.classList.contains("fepass-bar") ? el.remove() : el.removeAttribute(MARK)));
  }

  function applyPrice() {
    document.querySelectorAll(".fepass-btn").forEach((btn) => {
      const el = btn.querySelector(".fepass-btn__price");
      el.textContent = priceText(btn.dataset.kind);
      el.hidden = priceOf(btn.dataset.kind) === null;
    });
  }

  // Vào trang FuOverflow có đề FE mà chưa đăng nhập fepass.top: tự mời đăng nhập một lần mỗi phiên trình duyệt
  let promptTimer = 0;
  function maybePrompt() {
    if (auth.loggedIn || modal || promptTimer || !document.querySelector(".fepass-btn")) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* bỏ qua */
    }
    promptTimer = setTimeout(() => {
      promptTimer = 0;
      if (!auth.loggedIn && document.querySelector(".fepass-btn")) showLoginModal(null);
    }, 900);
  }

  // Trang nạp thêm bài khi cuộn / chuyển trang kiểu ajax: quét lại (gộp nhiều thay đổi liên tiếp thành một lần)
  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(scan, 250);
  };

  async function init() {
    settings = await fepassGetSettings();
    auth = await fepassGetAuth(settings.siteUrl);
    scan();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });

    chrome.runtime.sendMessage({ type: "price" }, (res) => {
      if (chrome.runtime.lastError) return;
      price = res && Number.isFinite(res.price) ? res.price : null;
      pePrice = res && Number.isFinite(res.pePrice) ? res.pePrice : null;
      applyPrice();
    });

    // Người dùng đăng nhập ở tab fepass.top thì hộp thoại đổi sang "Đã kết nối" ngay; đổi cài đặt trong popup cũng có hiệu lực ngay
    chrome.storage.onChanged.addListener(async () => {
      settings = await fepassGetSettings();
      auth = await fepassGetAuth(settings.siteUrl);
      if (modal) modal.render();
      removeAll();
      scan();
    });
  }

  init();
})();

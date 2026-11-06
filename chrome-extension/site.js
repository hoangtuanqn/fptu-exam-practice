// Chạy trên chính website fepass.top: ghi lại cho tiện ích biết người dùng đã đăng nhập hay chưa.
// Website tự công bố trạng thái lên thẻ <html> (data-fepass-auth = in|out, data-fepass-user = tên hiển thị).
// Không đọc và không lưu token hay bất kỳ dữ liệu nhạy cảm nào.
(async () => {
  const settings = await fepassGetSettings();
  // Manifest cho chạy trên cả http://localhost để thử; chỉ tin trang đúng với địa chỉ website đã cấu hình
  if (location.origin !== settings.siteUrl) return;

  const root = document.documentElement;
  let last = "";

  const publish = () => {
    const state = root.dataset.fepassAuth;
    if (state !== "in" && state !== "out") return; // website chưa xác thực xong phiên: chưa ghi gì
    const name = root.dataset.fepassUser || "";
    const key = `${state}|${name}`;
    if (key === last) return;
    last = key;
    chrome.storage.local.set({ fepassAuth: { state, name, origin: location.origin, at: Date.now() } });
  };

  publish();
  new MutationObserver(publish).observe(root, { attributes: true, attributeFilter: ["data-fepass-auth", "data-fepass-user"] });
})();

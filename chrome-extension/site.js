// Chạy trên chính website fepass.top: ghi lại cho tiện ích biết người dùng đã đăng nhập hay chưa.
// Website tự công bố trạng thái lên thẻ <html> (data-fepass-auth = in|out, data-fepass-user = tên hiển thị).
// Không đọc và không lưu token hay bất kỳ dữ liệu nhạy cảm nào.
(async () => {
  // Báo cho website biết tiện ích đã được cài (website dùng để ẩn lời nhắc cài đặt); chỉ là một cờ, không kèm dữ liệu nào
  document.documentElement.dataset.fepassExt = chrome.runtime.getManifest().version;

  chrome.runtime.sendMessage({ type: "checkUpdate" }, () => void chrome.runtime.lastError); // mỗi lần vào website: kiểm tra bản mới

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

  // ---- Đồng bộ điểm FAP (chỉ khi sinh viên tự bật ở trang Điểm FAP)
  // Website công bố công tắc qua data-fepass-grade-sync (on|off); tiện ích nhớ để trang FAP biết có được đọc điểm không.
  let lastSync = "";
  const publishSync = () => {
    const v = root.dataset.fepassGradeSync;
    if (v !== "on" && v !== "off") return;
    if (v === lastSync) return;
    lastSync = v;
    chrome.storage.local.set({ gradeSync: { enabled: v === "on", origin: location.origin, at: Date.now() } });
    if (v === "off") chrome.storage.local.remove("fapGrades"); // tắt đồng bộ thì xoá luôn điểm đã đọc trong tiện ích
  };
  publishSync();
  new MutationObserver(publishSync).observe(root, { attributes: true, attributeFilter: ["data-fepass-grade-sync"] });

  // Trang web xin điểm đã đọc: trả lại dưới dạng chuỗi JSON (website tự gửi lên tài khoản của chính sinh viên)
  const sendGrades = async () => {
    const { fapGrades } = await chrome.storage.local.get("fapGrades");
    document.dispatchEvent(new CustomEvent("fepass:grades", { detail: JSON.stringify(fapGrades || null) }));
  };
  document.addEventListener("fepass:grades-request", sendGrades);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.fapGrades) sendGrades();
  });
})();

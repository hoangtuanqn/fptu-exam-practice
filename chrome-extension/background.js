// Service worker: lấy phí lấy đề từ API của fepass (content script chạy trong trang fuoverflow.com nên tự gọi sẽ bị chặn CORS,
// còn service worker có host_permissions nên gọi được). Chỉ GET một endpoint công khai, không gửi dữ liệu người dùng.
importScripts("shared.js");

const PRICE_TTL_MS = 10 * 60 * 1000;

async function fetchPrice(apiUrl, path) {
  const res = await fetch(`${apiUrl}/api/v1${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json || !json.data || !Number.isFinite(json.data.price)) throw new Error("Phản hồi không hợp lệ");
  return json.data.price;
}

// Giá lấy đề FE và giá tải đề PE; mỗi giá lỗi thì để null (nút vẫn hoạt động, chỉ không hiện số tiền)
async function getPrice() {
  const { apiUrl } = await fepassGetSettings();
  const cached = (await chrome.storage.local.get("prices")).prices;
  if (cached && cached.apiUrl === apiUrl && Date.now() - cached.at < PRICE_TTL_MS) return cached;
  const [price, pePrice] = await Promise.all([fetchPrice(apiUrl, "/crawl-jobs/price").catch(() => null), fetchPrice(apiUrl, "/pe/price").catch(() => null)]);
  const value = { price, pePrice, apiUrl, at: Date.now() };
  if (price !== null || pePrice !== null) await chrome.storage.local.set({ prices: value });
  return value;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.type !== "price") return;
  getPrice()
    .then((p) => sendResponse({ price: p.price, pePrice: p.pePrice }))
    .catch(() => sendResponse({ price: null, pePrice: null }));
  return true; // trả lời bất đồng bộ
});

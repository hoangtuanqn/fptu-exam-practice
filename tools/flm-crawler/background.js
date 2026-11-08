// Bấm biểu tượng tiện ích: mở trang công cụ trong một tab riêng (popup sẽ đóng khi mất tiêu điểm nên không hợp với việc chạy lâu)
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("crawler.html") });
});

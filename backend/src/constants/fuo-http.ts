// Header giống một trình duyệt Edge trên Windows khi mở FuOverflow. KHÔNG chứa cookie: cookie gắn riêng ở từng client (cấu hình admin hoặc client ẩn danh không cookie).
export const FUO_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Safari/537.36 Edg/158.0.0.0";

export const FUO_BROWSER_HEADERS: Record<string, string> = {
  "user-agent": FUO_USER_AGENT,
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "accept-language": "vi,en;q=0.9,en-GB;q=0.8,en-US;q=0.7,vi-VN;q=0.6",
  "cache-control": "max-age=0",
  priority: "u=0, i",
  "sec-ch-ua": '"Chromium";v="158", "Not.A/Brand";v="24", "Microsoft Edge";v="158"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "same-origin",
  "upgrade-insecure-requests": "1",
};

import { signToken, verifyToken } from "./marketing-token";

// Nút trong thư marketing đi qua /marketing/click?t=<token>: token chỉ chứa id dòng log, đích chuyển hướng lấy từ log (không từ URL).
const CLICK = "marketing-click:";

// Thư dựng sẵn dùng chuỗi này làm link nút; thay bằng link bấm thật sau khi đã giữ chỗ trong log (lúc đó mới có id).
// Không chứa ký tự bị esc() đổi nên giống nhau trong html và text.
export const CLICK_PLACEHOLDER = "__FEPASS_CLICK_URL__";

export const signClickToken = (secret: string, logId: number) => signToken(CLICK, secret, logId);
export const verifyClickToken = (secret: string, token: string) => verifyToken(CLICK, secret, token);

export const withClickUrl = <T extends { html: string; text: string }>(mail: T, url: string): T => ({
  ...mail,
  html: mail.html.replaceAll(CLICK_PLACEHOLDER, url),
  text: mail.text.replaceAll(CLICK_PLACEHOLDER, url),
});

/** Đường dẫn nội bộ an toàn để nối sau CLIENT_URL; giá trị lạ (rỗng, không bắt đầu bằng "/", "//host") thì về trang chủ. */
export const safeTarget = (target: string | null | undefined) => (target && target.startsWith("/") && !target.startsWith("//") ? target : "");

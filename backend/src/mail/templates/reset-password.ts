import { MAIL_BRAND } from "../../constants/mail";
import { button, esc, note, p, renderLayout, signature } from "../layout";

export interface ResetEmailInput {
  name: string;
  link: string;
  expiresMin: number;
}

export function renderResetPasswordEmail({ name, link, expiresMin }: ResetEmailInput) {
  const { company, deep } = MAIL_BRAND;

  const bodyHtml = [
    p(`Kính gửi <strong>${esc(name)}</strong>,`),
    p("Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Nhấn nút bên dưới để tạo mật khẩu mới."),
    button("Đặt lại mật khẩu", link),
    note(`Liên kết có hiệu lực <strong>${expiresMin} phút</strong> và chỉ dùng được một lần. Hết hạn thì bạn có thể yêu cầu liên kết mới ở trang Quên mật khẩu. Sau khi đặt lại, mọi thiết bị đang đăng nhập sẽ cần đăng nhập lại.`),
    note("Nếu bạn không yêu cầu đặt lại mật khẩu, không cần làm gì thêm: mật khẩu hiện tại vẫn được giữ nguyên và an toàn. Nếu bạn nhận được nhiều email như vậy mà không do bạn thực hiện, hãy liên hệ chúng tôi qua fanpage để được hỗ trợ."),
    note(`Nếu nút không bấm được, mở liên kết: <a href="${esc(link)}" target="_blank" style="color:${deep};word-break:break-all">${esc(link)}</a>`),
    signature(),
  ].join("");

  const html = renderLayout({
    title: "Yêu cầu đặt lại mật khẩu",
    preheader: `Liên kết đặt lại mật khẩu có hiệu lực ${expiresMin} phút.`,
    bodyHtml,
  });

  const text = [
    `Kính gửi ${name},`,
    "",
    "Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Mở liên kết sau để tạo mật khẩu mới:",
    link,
    "",
    `Liên kết có hiệu lực ${expiresMin} phút và chỉ dùng được một lần. Sau khi đặt lại, mọi thiết bị đang đăng nhập sẽ cần đăng nhập lại.`,
    "Nếu bạn không yêu cầu đặt lại mật khẩu, không cần làm gì thêm: mật khẩu hiện tại vẫn được giữ nguyên và an toàn.",
    "",
    "Trân trọng,",
    company,
  ].join("\n");

  return { html, text };
}

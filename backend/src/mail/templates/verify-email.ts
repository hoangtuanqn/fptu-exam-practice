import { MAIL_BRAND } from "../../constants/mail";
import { button, esc, note, p, renderLayout, signature } from "../layout";

export interface VerifyEmailInput {
  name: string;
  link: string;
  expiresHours: number;
}

export function renderVerifyEmail({ name, link, expiresHours }: VerifyEmailInput) {
  const { company, deep } = MAIL_BRAND;

  const bodyHtml = [
    p(`<strong>Xin chào ${esc(name)},</strong>`),
    p("Nhấn nút bên dưới để xác minh email. Sau khi xác minh, bạn có thể sử dụng đầy đủ các dịch vụ của hệ thống."),
    button("Xác minh email", link),
    note(`Liên kết có hiệu lực <strong>${expiresHours} giờ</strong> và chỉ dùng được một lần. Nếu nút không bấm được, mở: <a href="${esc(link)}" target="_blank" style="color:${deep};word-break:break-all">${esc(link)}</a>`),
    note("Không phải bạn đăng ký hoặc đổi email? Hãy bỏ qua email này."),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: "Xác minh email",
      preheader: `Liên kết xác minh email có hiệu lực ${expiresHours} giờ.`,
      bodyHtml,
    }),
    text: [
      `Xin chào ${name},`,
      "",
      "Mở liên kết sau để xác minh email của bạn:",
      link,
      "",
      `Liên kết có hiệu lực ${expiresHours} giờ, dùng một lần. Không phải bạn đăng ký hoặc đổi email? Hãy bỏ qua email này.`,
      "",
      "Trân trọng,",
      company,
    ].join("\n"),
  };
}

import { MAIL_BRAND } from "../../constants/mail";
import { button, esc, note, p, renderLayout } from "../layout";

export interface VerifyEmailInput {
  name: string;
  link: string;
  expiresHours: number;
}

export function renderVerifyEmail({ name, link, expiresHours }: VerifyEmailInput) {
  const { company, deep } = MAIL_BRAND;

  const bodyHtml = [
    p(`Xin chào ${esc(name)},`),
    p("Nhấn nút bên dưới để xác minh email của bạn."),
    button("Xác minh email", link),
    note(`Liên kết có hiệu lực ${expiresHours} giờ. Nếu không phải bạn đăng ký, hãy bỏ qua email này.`),
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

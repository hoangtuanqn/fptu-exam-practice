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
    p(`Kính gửi <strong>${esc(name)}</strong>,`),
    p("Chúng tôi đã nhận được yêu cầu xác minh địa chỉ email cho tài khoản của bạn. Nhấn nút bên dưới để hoàn tất."),
    button("Xác minh email", link),
    note(`Liên kết có hiệu lực <strong>${expiresHours} giờ</strong> và chỉ dùng được một lần. Hết hạn thì bạn có thể gửi lại ở Tài khoản → Hồ sơ.`),
    note("Nếu bạn không đăng ký hoặc đổi email, không cần làm gì thêm: tài khoản sẽ không thay đổi khi bạn không nhấn vào liên kết. Nếu nghi ngờ có người dùng email của bạn, hãy liên hệ chúng tôi qua fanpage."),
    note(`Nếu nút không bấm được, mở liên kết: <a href="${esc(link)}" target="_blank" style="color:${deep};word-break:break-all">${esc(link)}</a>`),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: "Xác minh địa chỉ email",
      preheader: `Liên kết xác minh email có hiệu lực ${expiresHours} giờ.`,
      bodyHtml,
    }),
    text: [
      `Kính gửi ${name},`,
      "",
      "Chúng tôi đã nhận được yêu cầu xác minh địa chỉ email cho tài khoản của bạn. Mở liên kết sau để hoàn tất:",
      link,
      "",
      `Liên kết có hiệu lực ${expiresHours} giờ và chỉ dùng được một lần. Nếu bạn không đăng ký hoặc đổi email, không cần làm gì thêm: tài khoản sẽ không thay đổi khi bạn không nhấn vào liên kết.`,
      "",
      "Trân trọng,",
      company,
    ].join("\n"),
  };
}

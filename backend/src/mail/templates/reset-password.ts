import { MAIL_BANNERS, MAIL_BRAND } from "../../constants/mail";
import { button, esc, note, p, renderLayout, signature } from "../layout";

export interface ResetEmailInput {
  name: string;
  link: string;
  expiresMin: number;
}

export function renderResetPasswordEmail({ name, link, expiresMin }: ResetEmailInput) {
  const { company, blue } = MAIL_BRAND;

  const bodyHtml = [
    p(`<strong>Xin chào ${esc(name)},</strong>`),
    p("Bạn vừa yêu cầu đặt lại mật khẩu. Nhấn nút bên dưới để tạo mật khẩu mới."),
    button("Đặt lại mật khẩu", link),
    note(`Liên kết có hiệu lực <strong>${expiresMin} phút</strong> và chỉ dùng được một lần. Nếu nút không bấm được, mở: <a href="${esc(link)}" target="_blank" style="color:${blue};word-break:break-all">${esc(link)}</a>`),
    note("Không phải bạn yêu cầu? Hãy bỏ qua email này, mật khẩu hiện tại vẫn an toàn."),
    signature(),
  ].join("");

  const html = renderLayout({
    title: "ĐẶT LẠI MẬT KHẨU",
    preheader: `Liên kết đặt lại mật khẩu có hiệu lực ${expiresMin} phút.`,
    banner: MAIL_BANNERS.reset,
    bodyHtml,
  });

  const text = [
    `Xin chào ${name},`,
    "",
    "Bạn vừa yêu cầu đặt lại mật khẩu. Mở liên kết sau để tạo mật khẩu mới:",
    link,
    "",
    `Liên kết có hiệu lực ${expiresMin} phút, dùng một lần. Không phải bạn yêu cầu? Hãy bỏ qua email này.`,
    "",
    "Trân trọng,",
    company,
  ].join("\n");

  return { html, text };
}

import path from "node:path";
import { env } from "../configs/env";
import { isMailConfigured, mailer, mailFrom } from "../configs/mailer";
import { MAIL_ASSETS_DIR, MAIL_BANNERS, MAIL_BRAND, type MailBanner } from "../constants/mail";
import { renderResetPasswordEmail } from "../mail/templates/reset-password";
import {
  renderChargeEmail,
  renderDepositEmail,
  renderOrderEmail,
  type ChargeEmailInput,
  type DepositEmailInput,
  type OrderEmailInput,
} from "../mail/templates/wallet-notice";

interface Rendered {
  html: string;
  text: string;
}

// Gửi một thư đã dựng sẵn. Ném lỗi nếu chưa cấu hình SMTP hoặc gửi thất bại (nơi gọi quyết định xử lý)
const send = async (to: string, subject: string, banner: MailBanner, { html, text }: Rendered) => {
  if (!isMailConfigured) throw new Error("Chưa cấu hình SMTP (SMTP_USER, SMTP_PASS)");
  await mailer.sendMail({
    from: mailFrom,
    to,
    subject,
    html,
    text,
    // Banner nhúng thẳng vào thư (cid) nên hiển thị cả khi chạy local, không cần ảnh trên internet
    attachments: [{ filename: banner.file, path: path.join(MAIL_ASSETS_DIR, banner.file), cid: banner.cid }],
  });
};

// Tiêu đề: [Tên hệ thống] + nội dung chính + số tiền/mã giao dịch, để nhìn hộp thư là biết ngay đó là thư gì
const tag = `[${MAIL_BRAND.product}]`;
const money = (n: number) => `${n.toLocaleString("vi-VN")} ₫`;

export const mailService = {
  sendPasswordReset: (input: { to: string; name: string; link: string }) =>
    send(
      input.to,
      `${tag} Yêu cầu đặt lại mật khẩu`,
      MAIL_BANNERS.reset,
      renderResetPasswordEmail({ name: input.name, link: input.link, expiresMin: env.PASSWORD_RESET_EXPIRES_MIN }),
    ),

  sendDepositCreated: (to: string, input: OrderEmailInput) =>
    send(to, `${tag} Lệnh nạp ${money(input.amount)} đang chờ thanh toán · ${input.code}`, MAIL_BANNERS.order, renderOrderEmail(input)),

  sendDepositSuccess: (to: string, input: DepositEmailInput) =>
    send(to, `${tag} Nạp tiền thành công +${money(input.amount)} · ${input.code}`, MAIL_BANNERS.deposit, renderDepositEmail(input)),

  sendFetchCharged: (to: string, input: ChargeEmailInput) =>
    send(to, `${tag} Biên lai: phí lấy đề −${money(input.amount)}`, MAIL_BANNERS.charge, renderChargeEmail(input)),
};

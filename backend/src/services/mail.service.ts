import path from "node:path";
import { env } from "../configs/env";
import { isMailConfigured, mailer, mailFrom } from "../configs/mailer";
import { MAIL_ASSETS_DIR, MAIL_BANNERS, MAIL_BRAND, type MailBanner } from "../constants/mail";
import { renderResetPasswordEmail } from "../mail/templates/reset-password";
import {
  renderChargeEmail,
  renderDepositEmail,
  renderGiftCodeEmail,
  renderReportRewardEmail,
  renderReferralEmail,
  renderOrderEmail,
  type ChargeEmailInput,
  type DepositEmailInput,
  type GiftCodeEmailInput,
  type ReportRewardEmailInput,
  type ReferralEmailInput,
  type OrderEmailInput,
} from "../mail/templates/wallet-notice";

import {
  renderAccountStatusEmail,
  renderAdjustEmail,
  renderPasswordChangedEmail,
  renderRefundEmail,
  renderWelcomeEmail,
  type AdjustEmailInput,
  type PasswordChangedEmailInput,
  type RefundEmailInput,
  type WelcomeEmailInput,
} from "../mail/templates/account-notice";

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
const money = (n: number) => `${n.toLocaleString("vi-VN")} ₫`; // số tiền chuyển khoản thật
const credit = (n: number) => `${n.toLocaleString("vi-VN")} credit`; // số dư ví

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
    send(to, `${tag} Nạp credit thành công +${credit(input.amount)} · ${input.code}`, MAIL_BANNERS.deposit, renderDepositEmail(input)),

  sendGiftCodeRedeemed: (to: string, input: GiftCodeEmailInput) =>
    send(to, `${tag} Nhận giftcode +${credit(input.amount)} · ${input.code}`, MAIL_BANNERS.deposit, renderGiftCodeEmail(input)),

  sendReportRewarded: (to: string, input: ReportRewardEmailInput) =>
    send(to, `${tag} Báo cáo đáp án được xác nhận +${credit(input.amount)}`, MAIL_BANNERS.deposit, renderReportRewardEmail(input)),

  sendReferralReward: (to: string, input: ReferralEmailInput) =>
    send(to, `${tag} ${input.kind === "commission" ? "Hoa hồng giới thiệu" : "Thưởng giới thiệu"} +${credit(input.amount)}`, MAIL_BANNERS.deposit, renderReferralEmail(input)),

  sendWelcome: (to: string, input: WelcomeEmailInput) =>
    send(to, `${tag} Chào mừng bạn, tài khoản đã sẵn sàng`, MAIL_BANNERS.welcome, renderWelcomeEmail(input)),

  sendPasswordChanged: (to: string, input: PasswordChangedEmailInput) =>
    send(to, `${tag} Mật khẩu của bạn vừa được thay đổi`, MAIL_BANNERS.security, renderPasswordChangedEmail(input)),

  sendRefund: (to: string, input: RefundEmailInput) =>
    send(to, `${tag} Hoàn phí lấy đề +${credit(input.amount)}`, MAIL_BANNERS.charge, renderRefundEmail(input)),

  sendBalanceAdjusted: (to: string, input: AdjustEmailInput) =>
    send(
      to,
      `${tag} Điều chỉnh số dư ví ${input.amount >= 0 ? "+" : "−"}${credit(Math.abs(input.amount))}`,
      MAIL_BANNERS.deposit,
      renderAdjustEmail(input),
    ),

  sendAccountStatus: (to: string, input: { name: string; banned: boolean; supportUrl: string }) =>
    send(
      to,
      `${tag} ${input.banned ? "Tài khoản của bạn đã bị khóa" : "Tài khoản của bạn đã được mở khóa"}`,
      MAIL_BANNERS.security,
      renderAccountStatusEmail(input),
    ),

  sendFetchCharged: (to: string, input: ChargeEmailInput) =>
    send(to, `${tag} Biên lai: phí lấy đề −${credit(input.amount)}`, MAIL_BANNERS.charge, renderChargeEmail(input)),
};

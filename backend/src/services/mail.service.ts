import { readFileSync } from "node:fs";
import path from "node:path";
import { env } from "../configs/env";
import { isMailConfigured, mailer, mailFrom } from "../configs/mailer";
import { MAIL_ASSETS_DIR, MAIL_BRAND, MAIL_IMAGES } from "../constants/mail";
import { renderReminderEmail, type ReminderEmailInput } from "../mail/templates/study-reminder";
import type { MarketingMail } from "../mail/templates/marketing";
import { renderResetPasswordEmail } from "../mail/templates/reset-password";
import { renderVerifyEmail } from "../mail/templates/verify-email";
import {
  renderChargeEmail,
  renderDepositEmail,
  renderGiftCodeEmail,
  renderProPurchasedEmail,
  renderReportRewardEmail,
  renderReferralEmail,
  renderOrderEmail,
  type ChargeEmailInput,
  type DepositEmailInput,
  type GiftCodeEmailInput,
  type ProEmailInput,
  type ReportRewardEmailInput,
  type ReferralEmailInput,
  type OrderEmailInput,
} from "../mail/templates/wallet-notice";

import {
  renderAccountStatusEmail,
  renderEmailChangedEmail,
  renderAdjustEmail,
  renderPasswordChangedEmail,
  renderRefundEmail,
  renderWelcomeEmail,
  type AdjustEmailInput,
  type EmailChangedInput,
  type PasswordChangedEmailInput,
  type RefundEmailInput,
  type WelcomeEmailInput,
} from "../mail/templates/account-notice";

interface Rendered {
  html: string;
  text: string;
}

// Gửi một thư đã dựng sẵn. Ném lỗi nếu chưa cấu hình SMTP hoặc gửi thất bại (nơi gọi quyết định xử lý)
const send = async (to: string, subject: string, { html, text }: Rendered, headers?: Record<string, string>) => {
  if (!isMailConfigured) throw new Error("Chưa cấu hình SMTP (SMTP_USER, SMTP_PASS)");
  await mailer.sendMail({
    from: mailFrom,
    to,
    subject,
    html,
    text,
    ...(headers && { headers }),
    // Ảnh bìa + logo nhúng thẳng vào thư (cid) nên hiển thị cả khi chạy local, không cần ảnh trên internet
    attachments: Object.values(MAIL_IMAGES).map(({ file, cid }) => ({ filename: file, path: path.join(MAIL_ASSETS_DIR, file), cid })),
  });
};

// Xem trước thư trên web (không có tệp đính kèm): thay ảnh cid bằng data URI của chính tệp đó. Đọc tệp một lần, giữ trong bộ nhớ.
let inlineImages: [string, string][] | undefined;
export const inlineMailImages = (html: string) => {
  inlineImages ??= Object.values(MAIL_IMAGES).map(({ file, cid }) => [`cid:${cid}`, `data:image/png;base64,${readFileSync(path.join(MAIL_ASSETS_DIR, file)).toString("base64")}`]);
  return inlineImages.reduce((h, [from, to]) => h.replaceAll(from, to), html);
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
      renderResetPasswordEmail({ name: input.name, link: input.link, expiresMin: env.PASSWORD_RESET_EXPIRES_MIN }),
    ),

  sendDepositCreated: (to: string, input: OrderEmailInput) =>
    send(to, `${tag} Lệnh nạp ${money(input.amount)} đang chờ thanh toán · ${input.code}`, renderOrderEmail(input)),

  sendDepositSuccess: (to: string, input: DepositEmailInput) =>
    send(to, `${tag} Nạp credit thành công +${credit(input.amount)} · ${input.code}`, renderDepositEmail(input)),

  sendVerifyEmail: (to: string, input: { name: string; link: string; expiresHours: number }) =>
    send(to, `${tag} Xác minh email của bạn`, renderVerifyEmail(input)),

  sendEmailChanged: (to: string, input: EmailChangedInput) =>
    send(to, `${tag} Email đăng nhập của bạn vừa được đổi`, renderEmailChangedEmail(input)),

  sendGiftCodeRedeemed: (to: string, input: GiftCodeEmailInput) =>
    send(to, `${tag} Nhận giftcode +${credit(input.amount)} · ${input.code}`, renderGiftCodeEmail(input)),

  sendProPurchased: (to: string, input: ProEmailInput) =>
    send(to, `${tag} ${input.renewed ? "Gia hạn" : "Kích hoạt"} gói ${input.planName} thành công`, renderProPurchasedEmail(input)),

  sendReportRewarded: (to: string, input: ReportRewardEmailInput) =>
    send(to, `${tag} Báo cáo đáp án được xác nhận +${credit(input.amount)}`, renderReportRewardEmail(input)),

  sendReferralReward: (to: string, input: ReferralEmailInput) =>
    send(to, `${tag} ${input.kind === "commission" ? "Hoa hồng giới thiệu" : "Thưởng giới thiệu"} +${credit(input.amount)}`, renderReferralEmail(input)),

  // Thư nhắc ôn: có header List-Unsubscribe để Gmail/Outlook hiện nút hủy đăng ký (giảm nguy cơ bị đánh dấu spam)
  sendReviewReminder: (to: string, input: ReminderEmailInput) =>
    send(to, `${tag} Hôm nay có ${input.due} câu cần ôn`, renderReminderEmail(input), { "List-Unsubscribe": `<${input.unsubscribeLink}>` }),

  sendWelcome: (to: string, input: WelcomeEmailInput) =>
    send(to, `${tag} Chào mừng bạn, tài khoản đã sẵn sàng`, renderWelcomeEmail(input)),

  sendPasswordChanged: (to: string, input: PasswordChangedEmailInput) =>
    send(to, `${tag} Mật khẩu của bạn vừa được thay đổi`, renderPasswordChangedEmail(input)),

  sendRefund: (to: string, input: RefundEmailInput) =>
    send(to, `${tag} Hoàn phí lấy đề +${credit(input.amount)}`, renderRefundEmail(input)),

  sendBalanceAdjusted: (to: string, input: AdjustEmailInput) =>
    send(
      to,
      `${tag} Điều chỉnh số dư ví ${input.amount >= 0 ? "+" : "−"}${credit(Math.abs(input.amount))}`,
      renderAdjustEmail(input),
    ),

  sendAccountStatus: (to: string, input: { name: string; banned: boolean; supportUrl: string }) =>
    send(
      to,
      `${tag} ${input.banned ? "Tài khoản của bạn đã bị khóa" : "Tài khoản của bạn đã được mở khóa"}`,
      renderAccountStatusEmail(input),
    ),

  // Thư marketing tự động: header hủy một chạm (RFC 8058) trỏ về API, Gmail/Outlook hiện nút "Hủy đăng ký" gửi POST tới đó
  sendMarketing: (to: string, mail: MarketingMail, oneClickUrl: string) =>
    send(to, `${tag} ${mail.subject}`, mail, { "List-Unsubscribe": `<${oneClickUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }),

  sendFetchCharged: (to: string, input: ChargeEmailInput) =>
    send(to, `${tag} Biên lai: phí lấy đề −${credit(input.amount)}`, renderChargeEmail(input)),
};

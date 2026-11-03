import path from "node:path";
import { env } from "../configs/env";
import { isMailConfigured, mailer, mailFrom } from "../configs/mailer";
import { BANNER_CID, MAIL_ASSETS_DIR, MAIL_BRAND } from "../constants/mail";
import { renderResetPasswordEmail } from "../mail/templates/reset-password";

export const mailService = {
  // Gửi email đặt lại mật khẩu. Ném lỗi nếu chưa cấu hình SMTP hoặc gửi thất bại (nơi gọi quyết định xử lý)
  async sendPasswordReset(input: { to: string; name: string; link: string }) {
    if (!isMailConfigured) throw new Error("Chưa cấu hình SMTP (SMTP_USER, SMTP_PASS)");

    const { html, text } = renderResetPasswordEmail({
      name: input.name,
      link: input.link,
      expiresMin: env.PASSWORD_RESET_EXPIRES_MIN,
    });
    await mailer.sendMail({
      from: mailFrom,
      to: input.to,
      subject: `Khôi phục mật khẩu - ${MAIL_BRAND.product}`,
      html,
      text,
      // Banner nhúng thẳng vào thư (cid) nên hiển thị cả khi chạy local, không cần ảnh trên internet
      attachments: [{ filename: "banner.png", path: path.join(MAIL_ASSETS_DIR, "reset-banner.png"), cid: BANNER_CID }],
    });
  },
};

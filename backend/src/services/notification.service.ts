import { env } from "../configs/env";
import { userRepository } from "../repositories/user.repository";
import { threadUrl } from "../utils/fuo-url";
import { mailService } from "./mail.service";

const walletUrl = () => `${env.CLIENT_URL}/account/transactions`;

// Gửi thông báo qua email. Không bao giờ ném lỗi và không bắt người gọi chờ:
// thư lỗi (chưa cấu hình SMTP, Gmail từ chối...) chỉ được ghi log, không làm hỏng giao dịch đã hoàn tất.
const notify = (label: string, job: () => Promise<void>) => {
  void job().catch((err: Error) => console.error(`[mail] không gửi được thư "${label}": ${err.message}`));
};

export const notificationService = {
  // Người dùng vừa tạo lệnh nạp: gửi thông tin chuyển khoản để họ có sẵn trong hộp thư
  depositCreated(n: {
    userId: number;
    code: string;
    amount: number;
    expiresAt: Date;
    payment: { bankCode: string; accountNumber: string; accountName: string; qrUrl: string };
  }) {
    notify("lệnh nạp tiền", async () => {
      const user = await userRepository.findById(n.userId);
      if (!user) return;
      await mailService.sendDepositCreated(user.email, {
        name: user.fullName,
        code: n.code,
        amount: n.amount,
        bankCode: n.payment.bankCode,
        accountNumber: n.payment.accountNumber,
        accountName: n.payment.accountName,
        expiresAt: n.expiresAt,
        qrUrl: n.payment.qrUrl,
        orderUrl: `${env.CLIENT_URL}/account/deposit`,
      });
    });
  },

  // Tiền nạp đã khớp lệnh và được cộng vào ví (gọi SAU khi transaction cộng tiền đã commit)
  depositSuccess(n: { userId: number; code: string; amount: number; balanceAfter: number }) {
    notify("nạp tiền thành công", async () => {
      const user = await userRepository.findById(n.userId);
      if (!user) return;
      await mailService.sendDepositSuccess(user.email, {
        name: user.fullName,
        code: n.code,
        amount: n.amount,
        balanceAfter: n.balanceAfter,
        at: new Date(),
        walletUrl: walletUrl(),
      });
    });
  },

  // Vừa bị trừ phí lấy đề (gọi SAU khi transaction trừ tiền đã commit)
  fetchCharged(n: { userId: number; amount: number; balanceAfter: number; threadId: string; examTitle?: string }) {
    notify("trừ phí lấy đề", async () => {
      const user = await userRepository.findById(n.userId);
      if (!user) return;
      await mailService.sendFetchCharged(user.email, {
        name: user.fullName,
        examLabel: n.examTitle ?? `Thread #${n.threadId}`,
        examUrl: threadUrl(n.threadId),
        amount: n.amount,
        balanceAfter: n.balanceAfter,
        at: new Date(),
        walletUrl: walletUrl(),
      });
    });
  },
};

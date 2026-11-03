import { env } from "../configs/env";
import { userRepository } from "../repositories/user.repository";
import { threadUrl } from "../utils/fuo-url";
import { MAIL_BRAND } from "../constants/mail";
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
        orderUrl: `${env.CLIENT_URL}/deposit/${n.code}`,
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

  // Đăng ký xong: thư chào mừng (có sẵn email/tên nên không cần truy vấn lại)
  welcome(user: { email: string; fullName: string }) {
    notify("chào mừng", () => mailService.sendWelcome(user.email, { name: user.fullName, homeUrl: env.CLIENT_URL }));
  },

  // Mật khẩu vừa đổi (đặt lại qua email hoặc đổi trong hồ sơ): cảnh báo để người dùng phát hiện nếu không phải mình
  passwordChanged(n: { userId: number; via: "reset" | "profile" }) {
    notify("đổi mật khẩu", async () => {
      const user = await userRepository.findById(n.userId);
      if (!user) return;
      await mailService.sendPasswordChanged(user.email, {
        name: user.fullName,
        at: new Date(),
        via: n.via,
        forgotUrl: `${env.CLIENT_URL}/forgot-password`,
      });
    });
  },

  // Thưởng giới thiệu (đăng ký qua mã, hoặc hoa hồng khi người được giới thiệu nạp tiền). Gọi SAU khi transaction đã commit.
  referralReward(n: { recipientId: number; kind: "signup" | "referrer_signup" | "commission"; otherName: string; amount: number; balanceAfter: number }) {
    notify("thưởng giới thiệu", async () => {
      const user = await userRepository.findById(n.recipientId);
      if (!user) return;
      await mailService.sendReferralReward(user.email, {
        name: user.fullName,
        kind: n.kind,
        otherName: n.otherName,
        amount: n.amount,
        balanceAfter: n.balanceAfter,
        at: new Date(),
        walletUrl: walletUrl(),
      });
    });
  },

  // Báo cáo đáp án được admin xác nhận đúng và đã thưởng credit (gọi SAU khi transaction đã commit)
  reportApproved(n: { userId: number; examTitle: string; questionNumber: number; reward: number; balanceAfter: number }) {
    notify("thưởng báo cáo đáp án", async () => {
      const user = await userRepository.findById(n.userId);
      if (!user) return;
      await mailService.sendReportRewarded(user.email, {
        name: user.fullName,
        examTitle: n.examTitle,
        questionNumber: n.questionNumber,
        amount: n.reward,
        balanceAfter: n.balanceAfter,
        at: new Date(),
        walletUrl: walletUrl(),
      });
    });
  },

  // Vừa nhập giftcode nhận credit (gọi SAU khi transaction cộng credit đã commit)
  giftCodeRedeemed(n: { userId: number; code: string; amount: number; balanceAfter: number }) {
    notify("nhập giftcode", async () => {
      const user = await userRepository.findById(n.userId);
      if (!user) return;
      await mailService.sendGiftCodeRedeemed(user.email, {
        name: user.fullName,
        code: n.code,
        amount: n.amount,
        balanceAfter: n.balanceAfter,
        at: new Date(),
        walletUrl: walletUrl(),
      });
    });
  },

  // Lấy đề lỗi và đã hoàn phí (gọi SAU khi transaction hoàn phí đã commit)
  fetchRefunded(n: { userId: number; amount: number; balanceAfter: number; threadId: string }) {
    notify("hoàn phí lấy đề", async () => {
      const user = await userRepository.findById(n.userId);
      if (!user) return;
      await mailService.sendRefund(user.email, {
        name: user.fullName,
        examLabel: `Thread #${n.threadId}`,
        examUrl: threadUrl(n.threadId),
        amount: n.amount,
        balanceAfter: n.balanceAfter,
        at: new Date(),
        walletUrl: walletUrl(),
      });
    });
  },

  // Quản trị viên cộng/trừ tiền thủ công
  balanceAdjusted(n: { userId: number; amount: number; note: string | null; balanceAfter: number }) {
    notify("điều chỉnh số dư", async () => {
      const user = await userRepository.findById(n.userId);
      if (!user) return;
      await mailService.sendBalanceAdjusted(user.email, {
        name: user.fullName,
        amount: n.amount,
        note: n.note,
        balanceAfter: n.balanceAfter,
        at: new Date(),
        walletUrl: walletUrl(),
      });
    });
  },

  // Quản trị viên khóa / mở khóa tài khoản
  accountStatusChanged(n: { userId: number; banned: boolean }) {
    notify("trạng thái tài khoản", async () => {
      const user = await userRepository.findById(n.userId);
      if (!user) return;
      await mailService.sendAccountStatus(user.email, {
        name: user.fullName,
        banned: n.banned,
        supportUrl: MAIL_BRAND.facebookUrl,
      });
    });
  },
};

import { randomInt } from "node:crypto";
import type { DepositOrder } from "@prisma/client";
import type { SepayConfig } from "../constants/sepay";
import { prisma } from "../configs/prisma";
import { depositRepository } from "../repositories/deposit.repository";
import { AppError } from "../rules/error";
import type { CreateDepositBody, ListDepositsQuery } from "../rules/requests/deposit.request";
import { toMeta } from "../utils/pagination";
import { notificationService } from "./notification.service";
import { settingService } from "./setting.service";

const MAX_PENDING_PER_USER = 3;
// Bỏ ký tự dễ nhầm (0/O, 1/I) vì người dùng có thể gõ tay nội dung chuyển khoản
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

const randomCode = (prefix: string) =>
  prefix + Array.from({ length: CODE_LENGTH }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");

// Thông tin để hiển thị cho người dùng chuyển khoản; mã QR do SePay dựng sẵn
const toPayment = (config: SepayConfig, order: Pick<DepositOrder, "code" | "amount">) => ({
  bankCode: config.bankCode,
  accountNumber: config.accountNumber,
  accountName: config.accountName,
  amount: order.amount,
  content: order.code,
  qrUrl:
    "https://qr.sepay.vn/img?" +
    new URLSearchParams({
      acc: config.accountNumber,
      bank: config.bankCode,
      amount: String(order.amount),
      des: order.code,
    }),
});

const requireConfigured = async () => {
  const config = await settingService.getSepay();
  if (!config.accountNumber || !config.bankCode) throw new AppError("Chức năng nạp tiền chưa được cấu hình");
  return config;
};

export const depositService = {
  async info() {
    const config = await requireConfigured();
    return {
      minDeposit: config.minDeposit,
      orderExpireMinutes: config.orderExpireMinutes,
      bankCode: config.bankCode,
      accountNumber: config.accountNumber,
      accountName: config.accountName,
    };
  },

  async create(userId: number, { amount }: CreateDepositBody) {
    const config = await requireConfigured();
    if (amount < config.minDeposit) {
      throw new AppError(`Số tiền nạp tối thiểu ${config.minDeposit.toLocaleString("vi-VN")}đ`, 400, {
        amount: "Chưa đạt số tiền tối thiểu",
      });
    }
    if ((await depositRepository.countPending(userId)) >= MAX_PENDING_PER_USER) {
      throw new AppError("Bạn đang có quá nhiều lệnh nạp chưa thanh toán, vui lòng hoàn tất hoặc chờ hết hạn");
    }

    const expiresAt = new Date(Date.now() + config.orderExpireMinutes * 60_000);
    // Mã ngẫu nhiên gần như không trùng; nếu trùng (unique) thì thử lại vài lần
    for (let attempt = 0; ; attempt++) {
      try {
        const order = await depositRepository.create({
          userId,
          amount,
          expiresAt,
          code: randomCode(config.codePrefix),
        });
        const payment = toPayment(config, order);
        notificationService.depositCreated({
          userId,
          code: order.code,
          amount: order.amount,
          expiresAt: order.expiresAt,
          payment,
        });
        return { order, payment };
      } catch (err) {
        if (attempt >= 2 || (err as { code?: string }).code !== "P2002") throw err;
      }
    }
  },

  // Người dùng poll endpoint này để biết đã nhận tiền chưa
  async getOfUser(userId: number, code: string) {
    const order = await depositRepository.findByCodeOfUser(code, userId);
    if (!order) throw AppError.notFound("Không tìm thấy lệnh nạp");
    const payment = order.status === "PENDING" ? toPayment(await settingService.getSepay(), order) : undefined;
    return { order, payment };
  },

  // Xem lệnh nạp mà không cần đăng nhập (ví dụ người khác chuyển khoản hộ). Chỉ trả những gì cần để thanh toán:
  // mã, số tiền, trạng thái, thời hạn và thông tin tài khoản nhận. TUYỆT ĐỐI không có ID, tên, email của người tạo.
  async getPublic(code: string) {
    const order = await depositRepository.findByCode(prisma, code);
    if (!order) throw AppError.notFound("Không tìm thấy lệnh nạp");

    const expired = order.status === "EXPIRED" || (order.status === "PENDING" && order.expiresAt <= new Date());
    const status = expired ? "EXPIRED" : order.status;
    return {
      order: {
        code: order.code,
        amount: order.amount,
        status,
        createdAt: order.createdAt,
        expiresAt: order.expiresAt,
        paidAt: order.paidAt,
      },
      payment: status === "PENDING" ? toPayment(await settingService.getSepay(), order) : undefined,
    };
  },

  // admin (withUser) thấy người tạo lệnh; thành viên chỉ thấy lệnh của chính mình nên không cần
  async list(query: ListDepositsQuery, userId?: number, withUser = false) {
    const { items, total } = await depositRepository.list(query, { userId, status: query.status }, withUser);
    return { items, meta: toMeta(query, total) };
  },
};

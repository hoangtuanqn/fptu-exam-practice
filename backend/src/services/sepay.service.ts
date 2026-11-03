import { prisma } from "../configs/prisma";
import type { SepayConfig } from "../constants/sepay";
import { bankTransactionRepository } from "../repositories/bank-transaction.repository";
import { depositRepository } from "../repositories/deposit.repository";
import { settingRepository } from "../repositories/setting.repository";
import { AppError } from "../rules/error";
import { sepayClient, type SepayTransaction } from "./sepay.client";
import { notificationService } from "./notification.service";
import { settingService } from "./setting.service";
import { walletService } from "./wallet.service";

const LAST_RUN_KEY = "sepay.lastRun";

export interface SyncResult {
  at: string;
  ok: boolean;
  message: string;
  fetched: number;
  created: number;
  matched: number;
}

let running = false; // chặn chạy chồng giữa cron và nút "Chạy ngay"

// Tìm mã nạp trong nội dung chuyển khoản (ngân hàng có thể đổi hoa/thường, chèn khoảng trắng)
const extractCode = (content: string, prefix: string) =>
  content.toUpperCase().replace(/\s+/g, "").match(new RegExp(`${prefix}[A-Z0-9]{8}`))?.[0] ?? null;

// SePay trả giờ Việt Nam (GMT+7) không kèm múi giờ
const parseDate = (value: string) => new Date(`${value.replace(" ", "T")}+07:00`);

const normalize = (tx: SepayTransaction) => ({
  sepayId: String(tx.id),
  gateway: tx.bank_brand_name,
  accountNumber: tx.account_number,
  content: tx.transaction_content ?? "",
  amountIn: Math.round(Number(tx.amount_in)),
  referenceCode: tx.reference_number,
  transactionAt: parseDate(tx.transaction_date),
});

// Xử lý MỘT giao dịch trong một DB transaction: chiếm lệnh → ghi giao dịch ngân hàng → cộng ví.
// Trả về thông tin để gửi email báo nạp tiền; việc gửi thư làm ở ngoài transaction.
// Nếu sepayId đã tồn tại (unique) toàn bộ bị rollback nên không thể cộng tiền hai lần.
const processTransaction = async (tx: SepayTransaction, config: SepayConfig) => {
  const data = normalize(tx);
  const code = extractCode(data.content, config.codePrefix);

  return prisma.$transaction(async (db) => {
    const order = code ? await depositRepository.findByCode(db, code) : null;
    const matched = !!order && (await depositRepository.markPaid(db, order.id));

    await bankTransactionRepository.create(db, {
      ...data,
      status: matched ? "MATCHED" : "UNMATCHED",
      depositOrderId: matched ? order!.id : null,
    });
    if (!matched) return { matched: false as const };

    // Cộng đúng số tiền thực nhận (có thể khác số tiền khai báo trong lệnh)
    const entry = await walletService.applyChange(db, {
      userId: order!.userId,
      amount: data.amountIn,
      type: "DEPOSIT",
      note: `Nạp tiền ${order!.code}`,
    });
    return {
      matched: true as const,
      notice: { userId: order!.userId, code: order!.code, amount: data.amountIn, balanceAfter: entry.balanceAfter },
    };
  });
};

const isDuplicate = (err: unknown) => (err as { code?: string }).code === "P2002";

const runSync = async (): Promise<SyncResult> => {
  const config = await settingService.getSepay();
  await depositRepository.expireOverdue();

  if (!config.apiToken || !config.accountNumber) {
    return { at: "", ok: false, message: "Chưa cấu hình API token / số tài khoản", fetched: 0, created: 0, matched: 0 };
  }

  const remote = (await sepayClient.listTransactions(config)).filter((t) => Number(t.amount_in) > 0);
  const known = await bankTransactionRepository.findExistingSepayIds(remote.map((t) => String(t.id)));
  // Cũ → mới để cộng tiền theo đúng thứ tự phát sinh
  const fresh = remote
    .filter((t) => !known.has(String(t.id)))
    .sort((a, b) => parseDate(a.transaction_date).getTime() - parseDate(b.transaction_date).getTime());

  let created = 0;
  let matched = 0;
  for (const tx of fresh) {
    try {
      const result = await processTransaction(tx, config);
      if (result.matched) {
        matched++;
        notificationService.depositSuccess(result.notice); // sau khi transaction cộng tiền đã commit
      }
      created++;
    } catch (err) {
      if (!isDuplicate(err)) throw err; // giao dịch vừa được tiến trình khác xử lý
    }
  }
  return { at: "", ok: true, message: "Hoàn tất", fetched: remote.length, created, matched };
};

export const sepayService = {
  // Điểm vào duy nhất cho cron và nút chạy tay. Không bao giờ ném lỗi ra ngoài scheduler.
  async sync(): Promise<SyncResult> {
    if (running) throw new AppError("Đang có một lượt đối soát chạy, vui lòng thử lại sau");
    running = true;
    let result: SyncResult;
    try {
      result = await runSync();
    } catch (err) {
      result = { at: "", ok: false, message: (err as Error).message, fetched: 0, created: 0, matched: 0 };
    } finally {
      running = false;
    }
    result.at = new Date().toISOString();
    await settingRepository.setMany({ [LAST_RUN_KEY]: JSON.stringify(result) });
    return result;
  },

  async lastRun(): Promise<SyncResult | null> {
    const raw = (await settingRepository.getMany([LAST_RUN_KEY]))[LAST_RUN_KEY];
    return raw ? (JSON.parse(raw) as SyncResult) : null;
  },

  listBankTransactions: bankTransactionRepository.list,
};

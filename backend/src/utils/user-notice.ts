import type { TransactionType } from "@prisma/client";
import { USER_NOTICE_BODY_MAX, USER_NOTICE_TITLE_MAX, WALLET_NOTICE_LINK, type UserNoticeLevel } from "../constants/user-notice";
import { formatCredit } from "./format";

interface Spec {
  level: UserNoticeLevel;
  title: (amount: string, credit: boolean) => string;
}

const got = (what: string) => (a: string) => `Bạn nhận được ${a} ${what}`;
const paid = (what: string) => (a: string) => `Đã trừ ${a} ${what}`;
const back = (what: string) => (a: string) => `Đã hoàn ${a} ${what}`;

// Mỗi loại giao dịch một thông báo. Record trên enum: thêm loại giao dịch mới mà quên ở đây thì không build được.
// Tiền vào = success, trừ phí = info, hoàn tiền (việc trước đó không thành) và trừ ngoài ý muốn = warning.
export const WALLET_NOTICE: Record<TransactionType, Spec> = {
  DEPOSIT: { level: "success", title: (a) => `Nạp thành công ${a}` },
  DEPOSIT_BONUS: { level: "success", title: got("thưởng nạp tiền") },
  SIGNUP_BONUS: { level: "success", title: got("khi đăng ký") },
  GIFT_CODE: { level: "success", title: got("từ mã quà tặng") },
  REFERRAL_BONUS: { level: "success", title: got("thưởng giới thiệu") },
  REFERRAL_COMMISSION: { level: "success", title: got("hoa hồng giới thiệu") },
  REPORT_REWARD: { level: "success", title: got("thưởng báo cáo đáp án") },
  CHECKIN_REWARD: { level: "success", title: got("thưởng điểm danh") },
  ADMIN_ADJUST: { level: "success", title: (a, credit) => (credit ? `Tài khoản được cộng ${a}` : `Tài khoản bị trừ ${a}`) },
  CRAWL_CHARGE: { level: "info", title: paid("phí lấy đề") },
  EXPLAIN_CHARGE: { level: "info", title: paid("phí xem lời giải") },
  PE_CHARGE: { level: "info", title: paid("phí tải đề PE") },
  PLAN_CHARGE: { level: "info", title: paid("mua gói Pro") },
  COURSERA_CHARGE: { level: "info", title: paid("cho đơn Coursera") },
  CRAWL_REFUND: { level: "warning", title: back("do lấy đề không thành công") },
  EXPLAIN_REFUND: { level: "warning", title: back("phí xem lời giải") },
  PE_REFUND: { level: "warning", title: back("phí tải đề PE") },
  COURSERA_REFUND: { level: "warning", title: back("cho đơn Coursera") },
  CREDIT_EXPIRED: { level: "warning", title: (a) => `${a} từ mã quà tặng đã hết hạn` },
};

/** Thông báo cho một dòng sổ cái ví. amount âm = trừ. */
export function walletNotice(entry: { type: TransactionType; amount: number; balanceAfter: number; note?: string | null }) {
  const spec = WALLET_NOTICE[entry.type];
  const credit = entry.amount > 0;
  const body = [entry.note?.trim(), `Số dư hiện tại: ${formatCredit(entry.balanceAfter)}`].filter(Boolean).join("\n");
  return {
    kind: `wallet.${entry.type.toLowerCase()}`,
    level: !credit && spec.level === "success" ? "warning" : spec.level, // bị trừ thì không hiện như tin vui
    title: spec.title(formatCredit(Math.abs(entry.amount)), credit).slice(0, USER_NOTICE_TITLE_MAX),
    body: body.slice(0, USER_NOTICE_BODY_MAX),
    link: WALLET_NOTICE_LINK,
  };
}

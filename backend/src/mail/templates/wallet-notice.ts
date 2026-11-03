import { MAIL_BANNERS, MAIL_BRAND } from "../../constants/mail";
import { formatCredit, formatDateTimeVN, formatMoney } from "../../utils/format";
import { button, details, esc, note, p, qrImage, renderLayout, signature } from "../layout";

const { company } = MAIL_BRAND;

// ---------- Lệnh nạp tiền vừa được tạo

export interface OrderEmailInput {
  name: string;
  code: string; // nội dung chuyển khoản
  amount: number;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  expiresAt: Date;
  qrUrl: string;
  orderUrl: string;
}

export function renderOrderEmail(i: OrderEmailInput) {
  const rows = [
    { label: "Ngân hàng", value: esc(i.bankCode) },
    { label: "Số tài khoản", value: esc(i.accountNumber) },
    ...(i.accountName ? [{ label: "Chủ tài khoản", value: esc(i.accountName) }] : []),
    { label: "Số tiền", value: esc(formatMoney(i.amount)), strong: true },
    { label: "Nội dung chuyển khoản", value: esc(i.code), strong: true },
    { label: "Hiệu lực đến", value: esc(formatDateTimeVN(i.expiresAt)) },
  ];

  const bodyHtml = [
    p(`<strong>Xin chào ${esc(i.name)},</strong>`),
    p("Lệnh nạp tiền của bạn đã được tạo. Chuyển khoản <strong>đúng số tiền và nội dung</strong> bên dưới, tiền sẽ được cộng vào ví tự động."),
    details(rows),
    qrImage(i.qrUrl),
    button("Mở lệnh nạp tiền", i.orderUrl),
    note("Nhập chính xác nội dung chuyển khoản để hệ thống nhận diện. Lệnh quá hạn sẽ tự hủy, bạn có thể tạo lệnh mới."),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      eyebrow: "THANH TOÁN",
      title: "Lệnh nạp tiền đang chờ thanh toán",
      preheader: `Chuyển khoản ${formatMoney(i.amount)} với nội dung ${i.code} trước ${formatDateTimeVN(i.expiresAt)}.`,
      banner: MAIL_BANNERS.order,
      bodyHtml,
    }),
    text: [
      `Xin chào ${i.name},`,
      "",
      "Lệnh nạp tiền của bạn đã được tạo. Chuyển khoản đúng số tiền và nội dung sau:",
      `Ngân hàng: ${i.bankCode}`,
      `Số tài khoản: ${i.accountNumber}`,
      i.accountName ? `Chủ tài khoản: ${i.accountName}` : "",
      `Số tiền: ${formatMoney(i.amount)}`,
      `Nội dung: ${i.code}`,
      `Hiệu lực đến: ${formatDateTimeVN(i.expiresAt)}`,
      "",
      `Mở lệnh nạp tiền: ${i.orderUrl}`,
      "",
      "Trân trọng,",
      company,
    ]
      .filter((l, idx, arr) => l !== "" || arr[idx - 1] !== "")
      .join("\n"),
  };
}

// ---------- Tiền nạp đã khớp lệnh

export interface DepositEmailInput {
  name: string;
  code: string;
  amount: number;
  balanceAfter: number;
  at: Date;
  walletUrl: string;
}

export function renderDepositEmail(i: DepositEmailInput) {
  const bodyHtml = [
    p(`<strong>Xin chào ${esc(i.name)},</strong>`),
    p("Chúng mình đã nhận được tiền chuyển khoản và cộng credit vào ví của bạn."),
    details([
      { label: "Mã nạp", value: esc(i.code) },
      { label: "Thời gian", value: esc(formatDateTimeVN(i.at)) },
      { label: "Credit đã cộng", value: `+${esc(formatCredit(i.amount))}`, strong: true },
      { label: "Số dư hiện tại", value: esc(formatCredit(i.balanceAfter)) },
    ]),
    button("Xem lịch sử giao dịch", i.walletUrl),
    note("Không nhận ra giao dịch này? Hãy liên hệ chúng mình qua fanpage ngay."),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      eyebrow: "THANH TOÁN",
      title: "Nạp credit thành công",
      preheader: `Đã cộng ${formatCredit(i.amount)} vào ví. Số dư hiện tại: ${formatCredit(i.balanceAfter)}.`,
      banner: MAIL_BANNERS.deposit,
      bodyHtml,
    }),
    text: [
      `Xin chào ${i.name},`,
      "",
      "Chúng mình đã nhận được tiền chuyển khoản và cộng credit vào ví của bạn.",
      `Mã nạp: ${i.code}`,
      `Credit đã cộng: +${formatCredit(i.amount)}`,
      `Số dư hiện tại: ${formatCredit(i.balanceAfter)}`,
      `Thời gian: ${formatDateTimeVN(i.at)}`,
      "",
      `Xem lịch sử giao dịch: ${i.walletUrl}`,
      "",
      "Trân trọng,",
      company,
    ].join("\n"),
  };
}

// ---------- Nhận credit từ giftcode

export interface GiftCodeEmailInput {
  name: string;
  code: string;
  amount: number;
  balanceAfter: number;
  at: Date;
  walletUrl: string;
}

export function renderGiftCodeEmail(i: GiftCodeEmailInput) {
  const bodyHtml = [
    p(`<strong>Xin chào ${esc(i.name)},</strong>`),
    p("Giftcode của bạn đã được áp dụng và credit đã được cộng vào ví."),
    details([
      { label: "Giftcode", value: esc(i.code) },
      { label: "Thời gian", value: esc(formatDateTimeVN(i.at)) },
      { label: "Credit đã cộng", value: `+${esc(formatCredit(i.amount))}`, strong: true },
      { label: "Số dư hiện tại", value: esc(formatCredit(i.balanceAfter)) },
    ]),
    button("Xem lịch sử giao dịch", i.walletUrl),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      eyebrow: "QUÀ TẶNG",
      title: "Nhận credit thành công",
      preheader: `Đã cộng ${formatCredit(i.amount)} từ giftcode ${i.code}. Số dư hiện tại: ${formatCredit(i.balanceAfter)}.`,
      banner: MAIL_BANNERS.deposit,
      bodyHtml,
    }),
    text: [
      `Xin chào ${i.name},`,
      "",
      "Giftcode của bạn đã được áp dụng và credit đã được cộng vào ví.",
      `Giftcode: ${i.code}`,
      `Credit đã cộng: +${formatCredit(i.amount)}`,
      `Số dư hiện tại: ${formatCredit(i.balanceAfter)}`,
      `Thời gian: ${formatDateTimeVN(i.at)}`,
      "",
      `Xem lịch sử giao dịch: ${i.walletUrl}`,
      "",
      "Trân trọng,",
      company,
    ].join("\n"),
  };
}

// ---------- Thưởng báo cáo đáp án

export interface ReportRewardEmailInput {
  name: string;
  examTitle: string;
  questionNumber: number;
  amount: number;
  balanceAfter: number;
  at: Date;
  walletUrl: string;
}

export function renderReportRewardEmail(i: ReportRewardEmailInput) {
  const bodyHtml = [
    p(`<strong>Xin chào ${esc(i.name)},</strong>`),
    p("Cảm ơn bạn đã đóng góp. Báo cáo đáp án của bạn đã được xác nhận là chính xác, đáp án đã được cập nhật và credit thưởng đã vào ví."),
    details([
      { label: "Đề", value: esc(i.examTitle) },
      { label: "Câu", value: String(i.questionNumber) },
      { label: "Thời gian", value: esc(formatDateTimeVN(i.at)) },
      { label: "Credit thưởng", value: `+${esc(formatCredit(i.amount))}`, strong: true },
      { label: "Số dư hiện tại", value: esc(formatCredit(i.balanceAfter)) },
    ]),
    button("Xem lịch sử giao dịch", i.walletUrl),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      eyebrow: "ĐÓNG GÓP",
      title: "Báo cáo của bạn đã được xác nhận",
      preheader: `Nhận ${formatCredit(i.amount)} cho báo cáo đáp án câu ${i.questionNumber}. Số dư hiện tại: ${formatCredit(i.balanceAfter)}.`,
      banner: MAIL_BANNERS.deposit,
      bodyHtml,
    }),
    text: [
      `Xin chào ${i.name},`,
      "",
      "Báo cáo đáp án của bạn đã được xác nhận chính xác, đáp án đã được cập nhật và credit thưởng đã vào ví.",
      `Đề: ${i.examTitle}`,
      `Câu: ${i.questionNumber}`,
      `Credit thưởng: +${formatCredit(i.amount)}`,
      `Số dư hiện tại: ${formatCredit(i.balanceAfter)}`,
      `Thời gian: ${formatDateTimeVN(i.at)}`,
      "",
      `Xem lịch sử giao dịch: ${i.walletUrl}`,
      "",
      "Trân trọng,",
      company,
    ].join("\n"),
  };
}

// ---------- Phí lấy đề

export interface ChargeEmailInput {
  name: string;
  examLabel: string; // tên đề, hoặc "Thread #1234" nếu chưa biết tên
  examUrl: string; // liên kết thread trên FuOverflow
  amount: number;
  balanceAfter: number;
  at: Date;
  walletUrl: string;
}

export function renderChargeEmail(i: ChargeEmailInput) {
  const bodyHtml = [
    p(`<strong>Xin chào ${esc(i.name)},</strong>`),
    p("Ví của bạn vừa bị trừ phí cho lần lấy đề từ FuOverflow."),
    details([
      { label: "Đề", value: `<a href="${esc(i.examUrl)}" target="_blank" style="color:#0066ff">${esc(i.examLabel)}</a>` },
      { label: "Thời gian", value: esc(formatDateTimeVN(i.at)) },
      { label: "Phí lấy đề", value: `−${esc(formatCredit(i.amount))}`, strong: true },
      { label: "Số dư còn lại", value: esc(formatCredit(i.balanceAfter)) },
    ]),
    button("Xem lịch sử giao dịch", i.walletUrl),
    note("Phí tính cho mỗi lần lấy đề. Nếu việc lấy đề thất bại, phí được hoàn lại vào ví tự động."),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      eyebrow: "BIÊN LAI",
      title: "Phí lấy đề",
      preheader: `Đã trừ ${formatCredit(i.amount)} cho lần lấy đề. Số dư còn lại: ${formatCredit(i.balanceAfter)}.`,
      banner: MAIL_BANNERS.charge,
      bodyHtml,
    }),
    text: [
      `Xin chào ${i.name},`,
      "",
      "Ví của bạn vừa bị trừ phí cho lần lấy đề từ FuOverflow.",
      `Đề: ${i.examLabel} (${i.examUrl})`,
      `Phí lấy đề: -${formatCredit(i.amount)}`,
      `Số dư còn lại: ${formatCredit(i.balanceAfter)}`,
      `Thời gian: ${formatDateTimeVN(i.at)}`,
      "",
      "Nếu việc lấy đề thất bại, phí được hoàn lại tự động.",
      `Xem lịch sử giao dịch: ${i.walletUrl}`,
      "",
      "Trân trọng,",
      company,
    ].join("\n"),
  };
}

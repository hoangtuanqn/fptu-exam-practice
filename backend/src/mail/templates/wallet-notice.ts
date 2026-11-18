import { MAIL_BRAND } from "../../constants/mail";
import { formatCredit, formatDateTimeVN, formatMoney } from "../../utils/format";
import { button, details, esc, note, p, qrImage, renderLayout, signature } from "../layout";

const { company } = MAIL_BRAND;

// Cuối mọi thư giao dịch: nhắc đối chiếu và cách liên hệ khi có giao dịch lạ
const CHECK_NOTE = "Vui lòng đối chiếu thông tin trên với lịch sử giao dịch của bạn. Nếu phát hiện giao dịch không do bạn thực hiện, hãy liên hệ chúng tôi qua fanpage để được hỗ trợ kịp thời.";

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
  // Thư này giữ bảng vì người nhận cần sao chép từng thông tin chuyển khoản
  const rows = [
    { label: "Ngân hàng", value: esc(i.bankCode) },
    { label: "Số tài khoản", value: esc(i.accountNumber) },
    ...(i.accountName ? [{ label: "Chủ tài khoản", value: esc(i.accountName) }] : []),
    { label: "Số tiền", value: esc(formatMoney(i.amount)), strong: true },
    { label: "Nội dung chuyển khoản", value: esc(i.code), strong: true },
    { label: "Hiệu lực đến", value: esc(formatDateTimeVN(i.expiresAt)) },
  ];

  const bodyHtml = [
    p(`Kính gửi <strong>${esc(i.name)}</strong>,`),
    p("Lệnh nạp tiền của bạn đã được tạo. Vui lòng chuyển khoản <strong>đúng số tiền và nội dung</strong> dưới đây, credit sẽ được cộng vào ví tự động sau khi chúng tôi nhận được tiền."),
    details(rows),
    qrImage(i.qrUrl),
    button("Mở lệnh nạp tiền", i.orderUrl),
    note("Vui lòng nhập chính xác nội dung chuyển khoản để hệ thống nhận diện giao dịch. Lệnh quá hạn sẽ tự hủy, khi đó bạn có thể tạo lệnh mới."),
    note("Nếu bạn đã chuyển khoản nhưng sau vài phút chưa nhận được credit, hãy liên hệ chúng tôi qua fanpage kèm ảnh giao dịch để được kiểm tra."),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: "Lệnh nạp tiền đang chờ thanh toán",
      preheader: `Chuyển khoản ${formatMoney(i.amount)} với nội dung ${i.code} trước ${formatDateTimeVN(i.expiresAt)}.`,
      bodyHtml,
    }),
    text: [
      `Kính gửi ${i.name},`,
      "",
      "Lệnh nạp tiền của bạn đã được tạo. Vui lòng chuyển khoản đúng số tiền và nội dung sau:",
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
    p(`Kính gửi <strong>${esc(i.name)}</strong>,`),
    p(`Chúng tôi xác nhận đã nhận được khoản chuyển khoản của bạn. Giao dịch <strong>${esc(i.code)}</strong> được ghi nhận lúc ${esc(formatDateTimeVN(i.at))}, và <strong>+${esc(formatCredit(i.amount))}</strong> đã được cộng vào ví của bạn.`),
    p(`Số dư khả dụng hiện tại: <strong>${esc(formatCredit(i.balanceAfter))}</strong>.`),
    button("Xem lịch sử giao dịch", i.walletUrl),
    note(CHECK_NOTE),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: "Xác nhận nạp credit thành công",
      preheader: `Đã cộng ${formatCredit(i.amount)} vào ví. Số dư khả dụng: ${formatCredit(i.balanceAfter)}.`,
      bodyHtml,
    }),
    text: [
      `Kính gửi ${i.name},`,
      "",
      `Chúng tôi xác nhận đã nhận được khoản chuyển khoản của bạn. Giao dịch ${i.code} được ghi nhận lúc ${formatDateTimeVN(i.at)}, và +${formatCredit(i.amount)} đã được cộng vào ví của bạn.`,
      `Số dư khả dụng hiện tại: ${formatCredit(i.balanceAfter)}.`,
      "",
      `Xem lịch sử giao dịch: ${i.walletUrl}`,
      "",
      CHECK_NOTE,
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
    p(`Kính gửi <strong>${esc(i.name)}</strong>,`),
    p(`Chúng tôi xác nhận giftcode <strong>${esc(i.code)}</strong> đã được áp dụng lúc ${esc(formatDateTimeVN(i.at))}, và <strong>+${esc(formatCredit(i.amount))}</strong> đã được cộng vào ví của bạn.`),
    p(`Số dư khả dụng hiện tại: <strong>${esc(formatCredit(i.balanceAfter))}</strong>.`),
    button("Xem lịch sử giao dịch", i.walletUrl),
    note(CHECK_NOTE),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: "Xác nhận nhận credit từ giftcode",
      preheader: `Đã cộng ${formatCredit(i.amount)} từ giftcode ${i.code}. Số dư khả dụng: ${formatCredit(i.balanceAfter)}.`,
      bodyHtml,
    }),
    text: [
      `Kính gửi ${i.name},`,
      "",
      `Chúng tôi xác nhận giftcode ${i.code} đã được áp dụng lúc ${formatDateTimeVN(i.at)}, và +${formatCredit(i.amount)} đã được cộng vào ví của bạn.`,
      `Số dư khả dụng hiện tại: ${formatCredit(i.balanceAfter)}.`,
      "",
      `Xem lịch sử giao dịch: ${i.walletUrl}`,
      "",
      CHECK_NOTE,
      "",
      "Trân trọng,",
      company,
    ].join("\n"),
  };
}

// ---------- Mua / gia hạn gói Pro

export interface ProEmailInput {
  name: string;
  planName: string;
  duration: string; // ví dụ "4 tháng" hoặc "14 ngày"
  price: number;
  renewed: boolean;
  expiresAt: Date;
  balanceAfter: number;
  at: Date;
  proUrl: string;
}

export function renderProPurchasedEmail(i: ProEmailInput) {
  const action = i.renewed ? "gia hạn" : "kích hoạt";
  const bodyHtml = [
    p(`Kính gửi <strong>${esc(i.name)}</strong>,`),
    p(`Gói <strong>${esc(`${i.planName} ${i.duration}`)}</strong> của bạn đã được ${action} thành công lúc ${esc(formatDateTimeVN(i.at))}. Trong thời hạn này, việc mở đề và giải thích AI không bị trừ credit.`),
    p(`Chúng tôi đã trừ <strong>-${esc(formatCredit(i.price))}</strong> từ ví của bạn. Gói có hiệu lực đến <strong>${esc(formatDateTimeVN(i.expiresAt))}</strong>. Số dư khả dụng hiện tại: <strong>${esc(formatCredit(i.balanceAfter))}</strong>.`),
    button("Xem gói Pro của tôi", i.proUrl),
    note("Gói không tự động gia hạn: khi hết hạn, tài khoản trở về chế độ thông thường và không bị trừ thêm credit."),
    note(CHECK_NOTE),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: i.renewed ? "Xác nhận gia hạn gói Pro" : "Xác nhận kích hoạt gói Pro",
      preheader: `Pro có hiệu lực đến ${formatDateTimeVN(i.expiresAt)}. Đã trừ ${formatCredit(i.price)}.`,
      bodyHtml,
    }),
    text: [
      `Kính gửi ${i.name},`,
      "",
      `Gói ${i.planName} ${i.duration} của bạn đã được ${action} thành công lúc ${formatDateTimeVN(i.at)}.`,
      `Đã trừ: -${formatCredit(i.price)}`,
      `Pro có hiệu lực đến: ${formatDateTimeVN(i.expiresAt)}`,
      `Số dư khả dụng hiện tại: ${formatCredit(i.balanceAfter)}`,
      "",
      `Xem gói Pro: ${i.proUrl}`,
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
    p(`Kính gửi <strong>${esc(i.name)}</strong>,`),
    p(`Cảm ơn bạn đã đóng góp. Báo cáo của bạn về câu ${i.questionNumber} trong đề <strong>${esc(i.examTitle)}</strong> đã được xác nhận là chính xác, đáp án đã được cập nhật cho mọi người dùng.`),
    p(`Chúng tôi đã cộng <strong>+${esc(formatCredit(i.amount))}</strong> tiền thưởng vào ví của bạn lúc ${esc(formatDateTimeVN(i.at))}. Số dư khả dụng hiện tại: <strong>${esc(formatCredit(i.balanceAfter))}</strong>.`),
    button("Xem lịch sử giao dịch", i.walletUrl),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: "Báo cáo đáp án của bạn đã được xác nhận",
      preheader: `Nhận ${formatCredit(i.amount)} cho báo cáo đáp án câu ${i.questionNumber}. Số dư khả dụng: ${formatCredit(i.balanceAfter)}.`,
      bodyHtml,
    }),
    text: [
      `Kính gửi ${i.name},`,
      "",
      `Cảm ơn bạn đã đóng góp. Báo cáo của bạn về câu ${i.questionNumber} trong đề ${i.examTitle} đã được xác nhận là chính xác, đáp án đã được cập nhật.`,
      `Credit thưởng: +${formatCredit(i.amount)} (lúc ${formatDateTimeVN(i.at)})`,
      `Số dư khả dụng hiện tại: ${formatCredit(i.balanceAfter)}`,
      "",
      `Xem lịch sử giao dịch: ${i.walletUrl}`,
      "",
      "Trân trọng,",
      company,
    ].join("\n"),
  };
}

// ---------- Thưởng giới thiệu

export interface ReferralEmailInput {
  name: string;
  kind: "signup" | "referrer_signup" | "commission";
  otherName: string; // người giới thiệu (kind = signup) hoặc người được giới thiệu
  amount: number;
  balanceAfter: number;
  at: Date;
  walletUrl: string;
}

const REFERRAL_COPY: Record<ReferralEmailInput["kind"], { title: string; intro: (other: string) => string; label: string }> = {
  signup: { title: "Quà chào mừng từ lời giới thiệu", intro: () => "Cảm ơn bạn đã đăng ký qua lời giới thiệu. Credit chào mừng đã được cộng vào ví của bạn.", label: "credit chào mừng" },
  referrer_signup: { title: "Giới thiệu thành viên mới thành công", intro: (o) => `${o} vừa đăng ký bằng mã giới thiệu của bạn. Credit thưởng đã được cộng vào ví.`, label: "credit thưởng" },
  commission: { title: "Bạn nhận được hoa hồng giới thiệu", intro: (o) => `${o} vừa nạp credit, và bạn nhận được hoa hồng từ lần nạp này.`, label: "hoa hồng" },
};

export function renderReferralEmail(i: ReferralEmailInput) {
  const copy = REFERRAL_COPY[i.kind];
  const intro = copy.intro(i.otherName || "Một thành viên");
  const bodyHtml = [
    p(`Kính gửi <strong>${esc(i.name)}</strong>,`),
    p(esc(intro)),
    p(`Số ${copy.label} đã cộng: <strong>+${esc(formatCredit(i.amount))}</strong> (lúc ${esc(formatDateTimeVN(i.at))}). Số dư khả dụng hiện tại: <strong>${esc(formatCredit(i.balanceAfter))}</strong>.`),
    button("Xem lịch sử giao dịch", i.walletUrl),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: copy.title,
      preheader: `+${formatCredit(i.amount)} ${copy.label}. Số dư khả dụng: ${formatCredit(i.balanceAfter)}.`,
      bodyHtml,
    }),
    text: [
      `Kính gửi ${i.name},`,
      "",
      intro,
      `Số ${copy.label} đã cộng: +${formatCredit(i.amount)} (lúc ${formatDateTimeVN(i.at)})`,
      `Số dư khả dụng hiện tại: ${formatCredit(i.balanceAfter)}`,
      "",
      `Xem lịch sử giao dịch: ${i.walletUrl}`,
      "",
      "Trân trọng,",
      company,
    ].join("\n"),
  };
}

// ---------- Phí mở đề

export interface ChargeEmailInput {
  name: string;
  examLabel: string; // tên đề, hoặc "Thread #1234" nếu chưa biết tên
  examUrl: string; // không còn hiện trong thư (không dẫn người dùng ra ngoài hệ thống); giữ để không đổi nơi gọi
  amount: number;
  balanceAfter: number;
  at: Date;
  walletUrl: string;
}

export function renderChargeEmail(i: ChargeEmailInput) {
  const bodyHtml = [
    p(`Kính gửi <strong>${esc(i.name)}</strong>,`),
    p(`Chúng tôi đã trừ <strong>-${esc(formatCredit(i.amount))}</strong> từ ví của bạn cho lần mở đề <strong>${esc(i.examLabel)}</strong> lúc ${esc(formatDateTimeVN(i.at))}. Số dư còn lại: <strong>${esc(formatCredit(i.balanceAfter))}</strong>.`),
    button("Xem lịch sử giao dịch", i.walletUrl),
    note("Phí chỉ tính một lần cho mỗi đề. Nếu việc mở đề không thành công, phí sẽ được hoàn lại vào ví tự động."),
    note(CHECK_NOTE),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: "Thông báo phí mở đề",
      preheader: `Đã trừ ${formatCredit(i.amount)} cho lần mở đề. Số dư còn lại: ${formatCredit(i.balanceAfter)}.`,
      bodyHtml,
    }),
    text: [
      `Kính gửi ${i.name},`,
      "",
      `Chúng tôi đã trừ -${formatCredit(i.amount)} từ ví của bạn cho lần mở đề ${i.examLabel} lúc ${formatDateTimeVN(i.at)}.`,
      `Số dư còn lại: ${formatCredit(i.balanceAfter)}`,
      "",
      "Nếu việc mở đề không thành công, phí sẽ được hoàn lại tự động.",
      `Xem lịch sử giao dịch: ${i.walletUrl}`,
      "",
      "Trân trọng,",
      company,
    ].join("\n"),
  };
}

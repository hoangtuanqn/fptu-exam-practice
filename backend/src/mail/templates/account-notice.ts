import { MAIL_BRAND } from "../../constants/mail";
import { formatDateTimeVN, formatCredit } from "../../utils/format";
import { button, details, esc, heading, list, note, p, renderLayout, signature, supportLine } from "../layout";

const { company, product } = MAIL_BRAND;

const sign = (lines: string[]) => [...lines, "", "Trân trọng,", company].join("\n");

// ---------- Chào mừng thành viên mới

export interface WelcomeEmailInput {
  name: string;
  homeUrl: string;
}

export function renderWelcomeEmail({ name, homeUrl }: WelcomeEmailInput) {
  const bodyHtml = [
    p(`<strong>Xin chào ${esc(name)},</strong>`),
    p(`Tài khoản <strong>${esc(product)}</strong> của bạn đã sẵn sàng. Bạn có thể bắt đầu luyện đề ngay:`),
    list([
      "Dán link đề FuOverflow để lấy đề về kho riêng của bạn.",
      "Làm bài ở chế độ luyện tập hoặc thi, điểm tính theo thang 10.",
      "Mỗi lần nộp bài đều được lưu lại để xem chi tiết từng câu.",
    ]),
    button("Bắt đầu luyện đề", homeUrl),
    note("Các đề bạn đã lấy khi chưa đăng ký sẽ tự động chuyển vào kho của tài khoản này."),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: "Tài khoản đã sẵn sàng",
      preheader: `Chào mừng ${name} đến với ${product}. Bắt đầu luyện đề ngay.`,
      bodyHtml,
    }),
    text: sign([
      `Xin chào ${name},`,
      "",
      `Tài khoản ${product} của bạn đã sẵn sàng.`,
      "Dán link đề FuOverflow để lấy đề, làm bài và xem lịch sử từng lần làm.",
      `Bắt đầu: ${homeUrl}`,
    ]),
  };
}

// ---------- Email đăng nhập đã đổi (gửi tới địa chỉ CŨ)

export interface EmailChangedInput {
  name: string;
  newEmail: string;
  at: Date;
  forgotUrl: string;
}

export function renderEmailChangedEmail({ name, newEmail, at, forgotUrl }: EmailChangedInput) {
  const bodyHtml = [
    p(`<strong>Xin chào ${esc(name)},</strong>`),
    p("Email đăng nhập của tài khoản bạn vừa được đổi sang địa chỉ mới."),
    details([
      { label: "Email mới", value: esc(newEmail), strong: true },
      { label: "Thời gian", value: esc(formatDateTimeVN(at)) },
    ]),
    note("Không phải bạn thực hiện? Hãy liên hệ chúng mình ngay qua fanpage để được hỗ trợ khôi phục tài khoản."),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: "Email đăng nhập đã đổi",
      preheader: `Email tài khoản đã đổi sang ${newEmail}.`,
      bodyHtml,
    }),
    text: sign([
      `Xin chào ${name},`,
      "",
      `Email đăng nhập của tài khoản vừa được đổi sang ${newEmail} (${formatDateTimeVN(at)}).`,
      "Không phải bạn thực hiện? Hãy liên hệ chúng mình qua fanpage ngay.",
      `Quên mật khẩu: ${forgotUrl}`,
    ]),
  };
}

// ---------- Đổi mật khẩu

export interface PasswordChangedEmailInput {
  name: string;
  at: Date;
  via: "reset" | "profile";
  forgotUrl: string;
}

export function renderPasswordChangedEmail({ name, at, via, forgotUrl }: PasswordChangedEmailInput) {
  const how = via === "reset" ? "Đặt lại qua email" : "Đổi trong trang Hồ sơ";
  const bodyHtml = [
    p(`<strong>Xin chào ${esc(name)},</strong>`),
    p("Mật khẩu tài khoản của bạn vừa được thay đổi."),
    details([
      { label: "Thời gian", value: esc(formatDateTimeVN(at)) },
      { label: "Cách thực hiện", value: how },
    ]),
    heading("Không phải bạn thực hiện?"),
    p("Hãy đặt lại mật khẩu ngay để lấy lại quyền kiểm soát tài khoản, rồi liên hệ chúng mình."),
    button("Đặt lại mật khẩu", forgotUrl),
    supportLine(),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: "Mật khẩu đã được thay đổi",
      preheader: `Mật khẩu tài khoản ${product} vừa được thay đổi lúc ${formatDateTimeVN(at)}.`,
      bodyHtml,
    }),
    text: sign([
      `Xin chào ${name},`,
      "",
      `Mật khẩu tài khoản ${product} của bạn vừa được thay đổi (${how}) lúc ${formatDateTimeVN(at)}.`,
      `Không phải bạn? Đặt lại mật khẩu ngay: ${forgotUrl}`,
    ]),
  };
}

// ---------- Hoàn phí lấy đề

export interface RefundEmailInput {
  name: string;
  examLabel: string;
  examUrl: string;
  amount: number;
  balanceAfter: number;
  at: Date;
  walletUrl: string;
}

export function renderRefundEmail(i: RefundEmailInput) {
  const bodyHtml = [
    p(`<strong>Xin chào ${esc(i.name)},</strong>`),
    p("Lần lấy đề của bạn không thành công, chúng mình đã hoàn lại phí vào ví."),
    details([
      { label: "Đề", value: `<a href="${esc(i.examUrl)}" target="_blank" style="color:#0066ff">${esc(i.examLabel)}</a>` },
      { label: "Thời gian", value: esc(formatDateTimeVN(i.at)) },
      { label: "Đã hoàn", value: `+${esc(formatCredit(i.amount))}`, strong: true },
      { label: "Số dư hiện tại", value: esc(formatCredit(i.balanceAfter)) },
    ]),
    button("Xem lịch sử giao dịch", i.walletUrl),
    note("Bạn có thể thử lấy lại đề này sau ít phút. Nếu lỗi lặp lại, hãy liên hệ chúng mình qua fanpage."),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: "Đã hoàn phí lấy đề",
      preheader: `Đã hoàn ${formatCredit(i.amount)} vào ví. Số dư hiện tại: ${formatCredit(i.balanceAfter)}.`,
      bodyHtml,
    }),
    text: sign([
      `Xin chào ${i.name},`,
      "",
      "Lần lấy đề không thành công, phí đã được hoàn vào ví.",
      `Đề: ${i.examLabel} (${i.examUrl})`,
      `Đã hoàn: +${formatCredit(i.amount)}`,
      `Số dư hiện tại: ${formatCredit(i.balanceAfter)}`,
      `Xem lịch sử: ${i.walletUrl}`,
    ]),
  };
}

// ---------- Quản trị viên điều chỉnh số dư

export interface AdjustEmailInput {
  name: string;
  amount: number; // dương = cộng, âm = trừ
  note: string | null;
  balanceAfter: number;
  at: Date;
  walletUrl: string;
}

export function renderAdjustEmail(i: AdjustEmailInput) {
  const plus = i.amount >= 0;
  const money = `${plus ? "+" : "−"}${formatCredit(Math.abs(i.amount))}`;
  const bodyHtml = [
    p(`<strong>Xin chào ${esc(i.name)},</strong>`),
    p(`Quản trị viên vừa ${plus ? "cộng credit vào" : "trừ credit từ"} ví của bạn.`),
    details([
      { label: "Thời gian", value: esc(formatDateTimeVN(i.at)) },
      ...(i.note ? [{ label: "Lý do", value: esc(i.note) }] : []),
      { label: plus ? "Số tiền cộng" : "Số tiền trừ", value: esc(money), strong: true },
      { label: "Số dư hiện tại", value: esc(formatCredit(i.balanceAfter)) },
    ]),
    button("Xem lịch sử giao dịch", i.walletUrl),
    note("Thắc mắc về giao dịch này? Hãy liên hệ chúng mình qua fanpage."),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: "Số dư ví được điều chỉnh",
      preheader: `${money} · Số dư hiện tại: ${formatCredit(i.balanceAfter)}.`,
      bodyHtml,
    }),
    text: sign([
      `Xin chào ${i.name},`,
      "",
      `Quản trị viên vừa ${plus ? "cộng credit vào" : "trừ credit từ"} ví của bạn: ${money}.`,
      i.note ? `Lý do: ${i.note}` : "",
      `Số dư hiện tại: ${formatCredit(i.balanceAfter)}`,
      `Xem lịch sử: ${i.walletUrl}`,
    ].filter(Boolean)),
  };
}

// ---------- Khóa / mở khóa tài khoản

export function renderAccountStatusEmail(i: { name: string; banned: boolean; supportUrl: string }) {
  const bodyHtml = i.banned
    ? [
        p(`<strong>Xin chào ${esc(i.name)},</strong>`),
        p("Tài khoản của bạn đã bị <strong>khóa</strong> bởi quản trị viên, bạn không thể đăng nhập và sử dụng hệ thống."),
        p("Nếu bạn cho rằng đây là nhầm lẫn, hãy liên hệ chúng mình để được xem xét lại."),
        button("Liên hệ hỗ trợ", i.supportUrl),
        signature(),
      ]
    : [
        p(`<strong>Xin chào ${esc(i.name)},</strong>`),
        p("Tài khoản của bạn đã được <strong>mở khóa</strong>. Bạn có thể đăng nhập và tiếp tục sử dụng bình thường."),
        signature(),
      ];

  return {
    html: renderLayout({
      title: i.banned ? "Tài khoản đã bị khóa" : "Tài khoản đã được mở khóa",
      preheader: i.banned ? "Tài khoản của bạn đã bị khóa bởi quản trị viên." : "Tài khoản của bạn đã được mở khóa.",
      bodyHtml: bodyHtml.join(""),
    }),
    text: sign([
      `Xin chào ${i.name},`,
      "",
      i.banned ? "Tài khoản của bạn đã bị khóa bởi quản trị viên." : "Tài khoản của bạn đã được mở khóa.",
      i.banned ? `Liên hệ hỗ trợ: ${i.supportUrl}` : "",
    ].filter((l, idx, arr) => l !== "" || arr[idx - 1] !== "")),
  };
}

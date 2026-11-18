import { MAIL_BRAND } from "../../constants/mail";
import { formatDateTimeVN, formatCredit } from "../../utils/format";
import { button, esc, list, note, p, renderLayout, signature, supportLine } from "../layout";

const { company, product } = MAIL_BRAND;

const sign = (lines: string[]) => [...lines, "", "Trân trọng,", company].join("\n");

// ---------- Chào mừng thành viên mới

export interface WelcomeEmailInput {
  name: string;
  homeUrl: string;
}

export function renderWelcomeEmail({ name, homeUrl }: WelcomeEmailInput) {
  const bodyHtml = [
    p(`Kính gửi <strong>${esc(name)}</strong>,`),
    p(`Chào mừng bạn đến với <strong>${esc(product)}</strong>. Tài khoản của bạn đã sẵn sàng và bạn có thể bắt đầu luyện đề ngay:`),
    list([
      "Chọn môn học và mở đề thi để làm bài ở chế độ luyện tập hoặc thi, điểm tính theo thang 10.",
      "Mỗi lần nộp bài đều được lưu lại để bạn xem chi tiết từng câu.",
      "Câu làm sai được đưa vào sổ ôn tập để nhắc bạn ôn lại đúng lúc.",
    ]),
    button("Bắt đầu luyện đề", homeUrl),
    note("Các đề bạn đã mở khi chưa đăng ký sẽ tự động được chuyển vào kho của tài khoản này."),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: "Chào mừng bạn đến với " + product,
      preheader: `Tài khoản ${product} của bạn đã sẵn sàng. Bắt đầu luyện đề ngay.`,
      bodyHtml,
    }),
    text: sign([
      `Kính gửi ${name},`,
      "",
      `Chào mừng bạn đến với ${product}. Tài khoản của bạn đã sẵn sàng.`,
      "Chọn môn học, mở đề thi và làm bài; mỗi lần nộp bài đều được lưu lại để xem chi tiết từng câu.",
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
    p(`Kính gửi <strong>${esc(name)}</strong>,`),
    p(`Chúng tôi xin thông báo email đăng nhập của tài khoản bạn đã được đổi sang địa chỉ mới <strong>${esc(newEmail)}</strong> vào lúc ${esc(formatDateTimeVN(at))}. Email này sẽ không còn nhận thông báo của tài khoản.`),
    p("Nếu chính bạn thực hiện thay đổi này, bạn không cần làm gì thêm."),
    note("Nếu bạn không thực hiện, hãy liên hệ chúng tôi ngay qua fanpage để được hỗ trợ khôi phục tài khoản. Bạn cũng có thể đặt lại mật khẩu để bảo vệ tài khoản trong lúc chờ hỗ trợ."),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: "Email đăng nhập đã được thay đổi",
      preheader: `Email tài khoản đã đổi sang ${newEmail}.`,
      bodyHtml,
    }),
    text: sign([
      `Kính gửi ${name},`,
      "",
      `Email đăng nhập của tài khoản vừa được đổi sang ${newEmail} lúc ${formatDateTimeVN(at)}. Nếu chính bạn thực hiện, bạn không cần làm gì thêm.`,
      "Nếu bạn không thực hiện, hãy liên hệ chúng tôi qua fanpage ngay.",
      `Đặt lại mật khẩu: ${forgotUrl}`,
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
  const how = via === "reset" ? "đặt lại qua email" : "đổi trong trang Hồ sơ";
  const bodyHtml = [
    p(`Kính gửi <strong>${esc(name)}</strong>,`),
    p(`Chúng tôi xin thông báo mật khẩu tài khoản của bạn đã được thay đổi vào lúc ${esc(formatDateTimeVN(at))} (${how}). Từ giờ, bạn cần dùng mật khẩu mới để đăng nhập.`),
    p("Nếu chính bạn thực hiện thay đổi này, bạn không cần làm gì thêm."),
    p("<strong>Nếu bạn không thực hiện</strong>, hãy đặt lại mật khẩu ngay để lấy lại quyền kiểm soát tài khoản, sau đó liên hệ chúng tôi để được hỗ trợ."),
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
      `Kính gửi ${name},`,
      "",
      `Mật khẩu tài khoản ${product} của bạn đã được thay đổi (${how}) lúc ${formatDateTimeVN(at)}. Nếu chính bạn thực hiện, bạn không cần làm gì thêm.`,
      `Nếu bạn không thực hiện, hãy đặt lại mật khẩu ngay: ${forgotUrl}`,
    ]),
  };
}

// ---------- Hoàn phí mở đề

export interface RefundEmailInput {
  name: string;
  examLabel: string;
  examUrl: string; // không còn hiện trong thư (không dẫn người dùng ra ngoài hệ thống); giữ để không đổi nơi gọi
  amount: number;
  balanceAfter: number;
  at: Date;
  walletUrl: string;
}

export function renderRefundEmail(i: RefundEmailInput) {
  const bodyHtml = [
    p(`Kính gửi <strong>${esc(i.name)}</strong>,`),
    p(`Việc mở đề <strong>${esc(i.examLabel)}</strong> của bạn không thành công. Chúng tôi đã hoàn lại <strong>+${esc(formatCredit(i.amount))}</strong> vào ví của bạn lúc ${esc(formatDateTimeVN(i.at))}.`),
    p(`Số dư khả dụng hiện tại: <strong>${esc(formatCredit(i.balanceAfter))}</strong>.`),
    button("Xem lịch sử giao dịch", i.walletUrl),
    note("Bạn có thể thử mở lại đề sau ít phút. Nếu lỗi lặp lại, hãy liên hệ chúng tôi qua fanpage để được hỗ trợ."),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: "Thông báo hoàn phí mở đề",
      preheader: `Đã hoàn ${formatCredit(i.amount)} vào ví. Số dư khả dụng: ${formatCredit(i.balanceAfter)}.`,
      bodyHtml,
    }),
    text: sign([
      `Kính gửi ${i.name},`,
      "",
      `Việc mở đề ${i.examLabel} không thành công. Chúng tôi đã hoàn lại +${formatCredit(i.amount)} vào ví của bạn lúc ${formatDateTimeVN(i.at)}.`,
      `Số dư khả dụng hiện tại: ${formatCredit(i.balanceAfter)}`,
      `Xem lịch sử giao dịch: ${i.walletUrl}`,
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
    p(`Kính gửi <strong>${esc(i.name)}</strong>,`),
    p(`Quản trị viên đã ${plus ? "cộng" : "trừ"} <strong>${esc(money)}</strong> ${plus ? "vào" : "từ"} ví của bạn lúc ${esc(formatDateTimeVN(i.at))}.${i.note ? ` Lý do: ${esc(i.note)}.` : ""}`),
    p(`Số dư khả dụng hiện tại: <strong>${esc(formatCredit(i.balanceAfter))}</strong>.`),
    button("Xem lịch sử giao dịch", i.walletUrl),
    note("Nếu bạn có thắc mắc về giao dịch này, hãy liên hệ chúng tôi qua fanpage để được giải đáp."),
    signature(),
  ].join("");

  return {
    html: renderLayout({
      title: "Thông báo điều chỉnh số dư ví",
      preheader: `${money} · Số dư khả dụng: ${formatCredit(i.balanceAfter)}.`,
      bodyHtml,
    }),
    text: sign([
      `Kính gửi ${i.name},`,
      "",
      `Quản trị viên đã ${plus ? "cộng" : "trừ"} ${money} ${plus ? "vào" : "từ"} ví của bạn lúc ${formatDateTimeVN(i.at)}.`,
      i.note ? `Lý do: ${i.note}` : "",
      `Số dư khả dụng hiện tại: ${formatCredit(i.balanceAfter)}`,
      `Xem lịch sử giao dịch: ${i.walletUrl}`,
    ].filter(Boolean)),
  };
}

// ---------- Khóa / mở khóa tài khoản

export function renderAccountStatusEmail(i: { name: string; banned: boolean; supportUrl: string }) {
  const bodyHtml = i.banned
    ? [
        p(`Kính gửi <strong>${esc(i.name)}</strong>,`),
        p("Chúng tôi xin thông báo tài khoản của bạn đã bị <strong>khóa</strong> bởi quản trị viên. Trong thời gian này, bạn không thể đăng nhập và sử dụng hệ thống."),
        p("Nếu bạn cho rằng đây là sự nhầm lẫn, hãy liên hệ chúng tôi để được xem xét lại."),
        button("Liên hệ hỗ trợ", i.supportUrl),
        signature(),
      ]
    : [
        p(`Kính gửi <strong>${esc(i.name)}</strong>,`),
        p("Chúng tôi xin thông báo tài khoản của bạn đã được <strong>mở khóa</strong>. Bạn có thể đăng nhập và tiếp tục sử dụng hệ thống bình thường."),
        signature(),
      ];

  return {
    html: renderLayout({
      title: i.banned ? "Thông báo khóa tài khoản" : "Thông báo mở khóa tài khoản",
      preheader: i.banned ? "Tài khoản của bạn đã bị khóa bởi quản trị viên." : "Tài khoản của bạn đã được mở khóa.",
      bodyHtml: bodyHtml.join(""),
    }),
    text: sign([
      `Kính gửi ${i.name},`,
      "",
      i.banned ? "Tài khoản của bạn đã bị khóa bởi quản trị viên." : "Tài khoản của bạn đã được mở khóa.",
      i.banned ? `Liên hệ hỗ trợ: ${i.supportUrl}` : "",
    ].filter((l, idx, arr) => l !== "" || arr[idx - 1] !== "")),
  };
}

import { MAIL_BRAND } from "../../constants/mail";
import type { CourseraStatus } from "../../constants/coursera";
import { formatCredit, formatDateTimeVN } from "../../utils/format";
import { button, esc, note, p, renderLayout, signature } from "../layout";

const { company } = MAIL_BRAND;

// Never put account credentials (the Coursera email's password) in these mails.
export interface CourseraOrderEmailInput {
  name: string;
  orderId: string;
  courseTitle: string;
  event: "received" | "note" | Exclude<CourseraStatus, "PENDING">;
  amount: number; // charged for "received", refunded for REJECTED/CANCELLED, 0 otherwise (never shown for "note")
  balanceAfter: number | null;
  adminNote: string;
  at: Date;
  ordersUrl: string;
}

const COPY: Record<CourseraOrderEmailInput["event"], { title: string; lead: string; amountLabel?: string; sign?: string }> = {
  received: { title: "Đã tiếp nhận đơn Coursera", lead: "Chúng tôi đã tiếp nhận đơn Coursera của bạn và sẽ xử lý trong thời gian sớm nhất.", amountLabel: "phí đơn đã trừ", sign: "−" },
  note: { title: "Đơn Coursera có phản hồi mới", lead: "Quản trị viên vừa gửi phản hồi mới cho đơn Coursera của bạn." },
  PROCESSING: { title: "Đơn Coursera đang được xử lý", lead: "Đơn Coursera của bạn đang được xử lý." },
  COMPLETED: { title: "Đơn Coursera đã hoàn tất", lead: "Đơn Coursera của bạn đã được xử lý xong." },
  REJECTED: { title: "Đơn Coursera không được chấp nhận", lead: "Rất tiếc, chúng tôi không thể xử lý đơn Coursera của bạn.", amountLabel: "phí đơn đã hoàn", sign: "+" },
  CANCELLED: { title: "Đơn Coursera đã bị hủy", lead: "Đơn Coursera của bạn đã bị hủy.", amountLabel: "phí đơn đã hoàn", sign: "+" },
};

export function renderCourseraOrderEmail(i: CourseraOrderEmailInput) {
  const c = COPY[i.event];
  const showAmount = c.amountLabel && (i.event === "received" || i.amount > 0);
  const amountText = showAmount ? `${i.amount > 0 ? c.sign : ""}${formatCredit(i.amount)}` : "";
  const bodyHtml = [
    p(`Kính gửi <strong>${esc(i.name)}</strong>,`),
    p(`${esc(c.lead)} Đơn <strong>#${esc(i.orderId)}</strong>, khóa học <strong>${esc(i.courseTitle)}</strong>, cập nhật lúc ${esc(formatDateTimeVN(i.at))}.`),
    ...(i.adminNote ? [p(`Ghi chú từ quản trị viên: ${esc(i.adminNote)}`)] : []),
    ...(showAmount ? [p(`Số ${esc(c.amountLabel!)}: <strong>${esc(amountText)}</strong>.${i.balanceAfter !== null ? ` Số dư khả dụng hiện tại: <strong>${esc(formatCredit(i.balanceAfter))}</strong>.` : ""}`)] : []),
    button("Xem đơn của bạn", i.ordersUrl),
    ...(i.event === "received" ? [note("Nếu đơn bị từ chối hoặc hủy, phí sẽ được hoàn lại vào ví tự động.")] : []),
    signature(),
  ].join("");
  const text = [
    `Kính gửi ${i.name},`,
    "",
    c.lead,
    `Đơn: #${i.orderId}`,
    `Khóa học: ${i.courseTitle}`,
    ...(showAmount ? [`Số ${c.amountLabel}: ${amountText}`] : []),
    ...(showAmount && i.balanceAfter !== null ? [`Số dư khả dụng hiện tại: ${formatCredit(i.balanceAfter)}`] : []),
    ...(i.adminNote ? [`Ghi chú từ quản trị viên: ${i.adminNote}`] : []),
    `Thời gian: ${formatDateTimeVN(i.at)}`,
    "",
    `Xem đơn của bạn: ${i.ordersUrl}`,
    "",
    "Trân trọng,",
    company,
  ].join("\n");
  return { subject: c.title, html: renderLayout({ title: c.title, preheader: `${c.title}: ${i.courseTitle}`, bodyHtml }), text };
}

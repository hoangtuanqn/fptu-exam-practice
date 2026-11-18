import { MAIL_BRAND } from "../../constants/mail";
import type { CourseraStatus } from "../../constants/coursera";
import { formatCredit, formatDateTimeVN } from "../../utils/format";
import { button, details, esc, note, p, renderLayout, signature } from "../layout";

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
  received: { title: "Đã nhận đơn Coursera", lead: "Chúng mình đã nhận đơn Coursera của bạn và sẽ xử lý sớm nhất có thể.", amountLabel: "Phí đơn", sign: "−" },
  note: { title: "Đơn Coursera có phản hồi mới", lead: "Quản trị viên vừa gửi phản hồi mới cho đơn Coursera của bạn." },
  PROCESSING: { title: "Đơn Coursera đang xử lý", lead: "Đơn Coursera của bạn đang được xử lý." },
  COMPLETED: { title: "Đơn Coursera đã hoàn tất", lead: "Đơn Coursera của bạn đã được xử lý xong." },
  REJECTED: { title: "Đơn Coursera bị từ chối", lead: "Rất tiếc, đơn Coursera của bạn không thể xử lý.", amountLabel: "Đã hoàn", sign: "+" },
  CANCELLED: { title: "Đơn Coursera đã bị hủy", lead: "Đơn Coursera của bạn đã bị hủy.", amountLabel: "Đã hoàn", sign: "+" },
};

export function renderCourseraOrderEmail(i: CourseraOrderEmailInput) {
  const c = COPY[i.event];
  const showAmount = c.amountLabel && (i.event === "received" || i.amount > 0);
  const rows = [
    { label: "Đơn", value: `#${i.orderId}` },
    { label: "Khóa học", value: esc(i.courseTitle) },
    { label: "Thời gian", value: esc(formatDateTimeVN(i.at)) },
    ...(showAmount ? [{ label: c.amountLabel!, value: `${i.amount > 0 ? c.sign : ""}${esc(formatCredit(i.amount))}`, strong: true }] : []),
    ...(showAmount && i.balanceAfter !== null ? [{ label: "Số dư hiện tại", value: esc(formatCredit(i.balanceAfter)) }] : []),
    ...(i.adminNote ? [{ label: "Ghi chú", value: esc(i.adminNote) }] : []),
  ];
  const bodyHtml = [
    p(`<strong>Xin chào ${esc(i.name)},</strong>`),
    p(c.lead),
    details(rows),
    button("Xem đơn của bạn", i.ordersUrl),
    ...(i.event === "received" ? [note("Nếu đơn bị từ chối hoặc hủy, phí được hoàn lại vào ví tự động.")] : []),
    signature(),
  ].join("");
  const text = [
    `Xin chào ${i.name},`,
    "",
    c.lead,
    `Đơn: #${i.orderId}`,
    `Khóa học: ${i.courseTitle}`,
    ...(showAmount ? [`${c.amountLabel}: ${i.amount > 0 ? c.sign : ""}${formatCredit(i.amount)}`] : []),
    ...(showAmount && i.balanceAfter !== null ? [`Số dư hiện tại: ${formatCredit(i.balanceAfter)}`] : []),
    ...(i.adminNote ? [`Ghi chú: ${i.adminNote}`] : []),
    `Thời gian: ${formatDateTimeVN(i.at)}`,
    "",
    `Xem đơn của bạn: ${i.ordersUrl}`,
    "",
    "Trân trọng,",
    company,
  ].join("\n");
  return { subject: c.title, html: renderLayout({ title: c.title, preheader: `${c.title}: ${i.courseTitle}`, bodyHtml }), text };
}

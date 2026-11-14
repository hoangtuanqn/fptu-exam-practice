import { Prisma } from "@prisma/client";
import { COURSERA, COURSERA_TRANSITIONS } from "../constants/coursera";
import { courseraRepository } from "../repositories/coursera.repository";
import { AppError } from "../rules/error";
import type { CourseraCourseBody, CourseraCoursesQuery, CourseraOrderBody, CourseraOrdersQuery, CourseraStatusBody } from "../rules/requests/coursera.request";
import { walletService } from "./wallet.service";
import { readCourseraPassword } from "../utils/coursera-credentials";
import { CourseraUpstreamError, fetchCourseraName, parseCourseraLink } from "../utils/coursera-lookup";
import { formatCredit } from "../utils/format";
import { adminNoticeService } from "./admin-notice.service";
import { notificationService } from "./notification.service";

// Prisma errors may include argument values. Keep account details out of logs and error responses.
async function safe<T>(run: () => Promise<T>): Promise<T> {
  try { return await run(); }
  catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") throw AppError.conflict("Dữ liệu này đã tồn tại");
      if (error.code === "P2025") throw AppError.notFound();
    }
    throw new AppError("Không thể xử lý yêu cầu Coursera lúc này. Vui lòng thử lại.", 503);
  }
}

type Order = Awaited<ReturnType<typeof courseraRepository.updateStatus>>;
const ADMIN_LINK = "/admin/coursera";

function changeStatus(id: number, data: CourseraStatusBody, userId?: number) {
  return courseraRepository.transaction(async (tx) => {
    const order = await courseraRepository.updateStatus(tx, id, data, userId);
    if ((data.status === "CANCELLED" || data.status === "REJECTED") && order.amount > 0 && !order.refundedAt) {
      const entry = await walletService.applyChange(tx, { userId: order.userId, amount: order.amount, type: "COURSERA_REFUND", note: `Hoàn phí đơn Coursera #${order.id}` });
      return { order: await courseraRepository.markRefunded(tx, id), refunded: order.amount, balanceAfter: entry.balanceAfter };
    }
    return { order, refunded: 0, balanceAfter: undefined };
  });
}

// Notices and mails run after commit and never throw; they carry no credentials.
const mailOrder = (order: Order, event: Parameters<typeof notificationService.courseraOrder>[0]["event"], amount: number, balanceAfter?: number) =>
  notificationService.courseraOrder({ userId: order.userId, event, orderId: order.id, courseTitle: order.courseTitle, amount, balanceAfter, adminNote: event === "received" ? "" : order.adminNote });

export const courseraService = {
  courses: (query: CourseraCoursesQuery, admin = false) => safe(() => courseraRepository.courses(query, admin)),
  saveCourse: (data: CourseraCourseBody, id?: number) => safe(() => courseraRepository.saveCourse(data, id)),
  // Verifies a member-pasted link on Coursera and returns the matching catalog row, creating an unlisted one on first use.
  lookup: (raw: string, fetcher: typeof fetch = fetch) => safe(async () => {
    const link = parseCourseraLink(raw);
    if (!link) throw new AppError("Vui lòng nhập liên kết khóa học Coursera, dạng https://www.coursera.org/learn/...");
    const known = await courseraRepository.findCourseByUrl(link.url);
    if (known) return { ...known, kind: link.kind };
    let name: string | null;
    try { name = await fetchCourseraName(link, fetcher); } catch (error) {
      if (error instanceof CourseraUpstreamError) throw new AppError("Không kiểm tra được khóa học lúc này, vui lòng thử lại", 503);
      throw error;
    }
    if (!name) throw AppError.notFound("Không tìm thấy khóa học này trên Coursera");
    try {
      return { ...await courseraRepository.createLinkCourse({ url: link.url, title: name, price: COURSERA.linkPrice }), kind: link.kind };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      const raced = await courseraRepository.findCourseByUrl(link.url); // another lookup created it first
      if (!raced) throw error;
      return { ...raced, kind: link.kind };
    }
  }),
  orders: (query: CourseraOrdersQuery, userId?: number) => safe(() => courseraRepository.orders(query, userId)),
  createOrder: (userId: number, data: CourseraOrderBody) => safe(async () => {
    const existing = await courseraRepository.findRequest(userId, data.requestKey);
    if (existing) return existing;
    try {
      const { order, balanceAfter } = await courseraRepository.transaction(async (tx) => {
        const order = await courseraRepository.createOrder(tx, { ...data, userId });
        const charge = order.amount > 0 ? await walletService.charge(tx, { userId, amount: order.amount, type: "COURSERA_CHARGE", note: `Đặt đơn Coursera #${order.id}` }) : null;
        return { order, balanceAfter: charge?.balanceAfter };
      });
      adminNoticeService.push("coursera.ordered", { title: `Đơn Coursera mới #${order.id}`, body: `${order.courseTitle} · ${formatCredit(order.amount)}`, userId, link: ADMIN_LINK });
      mailOrder(order, "received", order.amount, balanceAfter);
      return order;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const duplicate = await courseraRepository.findRequest(userId, data.requestKey);
        if (duplicate) return duplicate;
      }
      throw error;
    }
  }),
  updateStatus: (id: number, data: CourseraStatusBody) => safe(async () => {
    if (!COURSERA_TRANSITIONS[data.expectedStatus].includes(data.status)) throw AppError.conflict("Không thể chuyển đơn sang trạng thái này");
    const { order, refunded, balanceAfter } = await changeStatus(id, data);
    if (order.status !== "PENDING") mailOrder(order, order.status, refunded, balanceAfter);
    return order;
  }),
  cancel: (id: number, userId: number) => safe(async () => {
    const { order, refunded, balanceAfter } = await changeStatus(id, { expectedStatus: "PENDING", status: "CANCELLED", adminNote: "" }, userId);
    adminNoticeService.push("coursera.cancelled", { title: `Đơn Coursera #${order.id} bị người dùng hủy`, body: `${order.courseTitle}${refunded ? ` · đã hoàn ${formatCredit(refunded)}` : ""}`, userId, link: ADMIN_LINK });
    mailOrder(order, "CANCELLED", refunded, balanceAfter);
    return order;
  }),
  credentials: (id: number, adminId: number) => safe(async () => {
    const row = await courseraRepository.credentials(id, adminId);
    return { email: row.email, password: readCourseraPassword(row.password!) };
  }),
};

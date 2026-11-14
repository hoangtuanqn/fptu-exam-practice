import { Prisma } from "@prisma/client";
import { COURSERA_TRANSITIONS } from "../constants/coursera";
import { courseraRepository } from "../repositories/coursera.repository";
import { AppError } from "../rules/error";
import type { CourseraCourseBody, CourseraCoursesQuery, CourseraOrderBody, CourseraOrdersQuery, CourseraStatusBody } from "../rules/requests/coursera.request";
import { walletService } from "./wallet.service";
import { decryptCourseraPassword, encryptCourseraPassword } from "../utils/coursera-credentials";

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

function changeStatus(id: number, data: CourseraStatusBody, userId?: number) {
  return courseraRepository.transaction(async (tx) => {
    const order = await courseraRepository.updateStatus(tx, id, data, userId);
    if ((data.status === "CANCELLED" || data.status === "REJECTED") && order.amount > 0 && !order.refundedAt) {
      await walletService.applyChange(tx, { userId: order.userId, amount: order.amount, type: "COURSERA_REFUND", note: `Hoàn phí đơn Coursera #${order.id}` });
      return courseraRepository.markRefunded(tx, id);
    }
    return order;
  });
}

export const courseraService = {
  courses: (query: CourseraCoursesQuery, admin = false) => safe(() => courseraRepository.courses(query, admin)),
  saveCourse: (data: CourseraCourseBody, id?: number) => safe(() => courseraRepository.saveCourse(data, id)),
  orders: (query: CourseraOrdersQuery, userId?: number) => safe(() => courseraRepository.orders(query, userId)),
  createOrder: (userId: number, data: CourseraOrderBody) => safe(async () => {
    const existing = await courseraRepository.findRequest(userId, data.requestKey);
    if (existing) return existing;
    const { password, ...rest } = data;
    try {
      const encryptedPassword = encryptCourseraPassword(password);
      return await courseraRepository.transaction(async (tx) => {
        const order = await courseraRepository.createOrder(tx, { ...rest, userId, encryptedPassword });
        if (order.amount > 0) await walletService.charge(tx, { userId, amount: order.amount, type: "COURSERA_CHARGE", note: `Đặt đơn Coursera #${order.id}` });
        return order;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const duplicate = await courseraRepository.findRequest(userId, data.requestKey);
        if (duplicate) return duplicate;
      }
      throw error;
    }
  }),
  updateStatus: (id: number, data: CourseraStatusBody) => safe(() => {
    if (!COURSERA_TRANSITIONS[data.expectedStatus].includes(data.status)) throw AppError.conflict("Không thể chuyển đơn sang trạng thái này");
    return changeStatus(id, data);
  }),
  cancel: (id: number, userId: number) => safe(() => changeStatus(id, { expectedStatus: "PENDING", status: "CANCELLED", adminNote: "" }, userId)),
  credentials: (id: number, adminId: number) => safe(async () => {
    const row = await courseraRepository.credentials(id, adminId);
    return { email: row.email, password: decryptCourseraPassword(row.encryptedPassword!) };
  }),
};

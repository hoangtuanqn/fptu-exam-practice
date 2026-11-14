import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import type { CourseraCourseBody, CourseraCoursesQuery, CourseraOrdersQuery, CourseraStatusBody } from "../rules/requests/coursera.request";
import { AppError } from "../rules/error";
import { isCourseraTerminal } from "../constants/coursera";
import { toMeta, toSkipTake } from "../utils/pagination";

// Never select credentials in a list or a mutation response.
const orderSelect = {
  id: true, userId: true, courseId: true, courseTitle: true, courseUrl: true,
  email: true, note: true, status: true, adminNote: true, createdAt: true, updatedAt: true, amount: true, refundedAt: true,
} satisfies Prisma.CourseraOrderSelect;

export const courseraRepository = {
  transaction: <T>(run: (tx: Prisma.TransactionClient) => Promise<T>) => prisma.$transaction(run),
  async courses(query: CourseraCoursesQuery, admin: boolean) {
    const where: Prisma.CourseraCourseWhereInput = {
      ...(!admin && { isActive: true, listed: true }),
      // utf8mb4_unicode_ci makes contains case-insensitive
      ...(query.q && { OR: [{ title: { contains: query.q } }, { code: { contains: query.q } }] }),
    };
    const [items, total] = await Promise.all([
      prisma.courseraCourse.findMany({ where, orderBy: { id: "desc" }, ...toSkipTake(query) }),
      prisma.courseraCourse.count({ where }),
    ]);
    return { items, meta: toMeta(query, total) };
  },
  saveCourse(data: CourseraCourseBody, id?: number) {
    return id ? prisma.courseraCourse.update({ where: { id }, data }) : prisma.courseraCourse.create({ data });
  },
  findCourseByUrl(url: string) {
    return prisma.courseraCourse.findUnique({ where: { url } });
  },
  createLinkCourse(data: { url: string; title: string; price: number }) {
    return prisma.courseraCourse.create({ data: { ...data, code: null, isActive: true, listed: false } });
  },
  async orders(query: CourseraOrdersQuery, userId?: number) {
    const where = { userId, status: query.status };
    const [items, total] = await Promise.all([
      prisma.courseraOrder.findMany({ where, select: orderSelect, orderBy: { id: "desc" }, ...toSkipTake(query) }),
      prisma.courseraOrder.count({ where }),
    ]);
    return { items, meta: toMeta(query, total) };
  },
  findRequest(userId: number, requestKey: string) {
    return prisma.courseraOrder.findUnique({ where: { userId_requestKey: { userId, requestKey } }, select: orderSelect });
  },
  async createOrder(tx: Prisma.TransactionClient, data: { userId: number; courseId: number; requestKey: string; email: string; password: string; note: string; expectedPrice: number }) {
    const { expectedPrice, ...order } = data;
    // Serialize catalog edits with checkout so the accepted price and availability stay consistent.
    await tx.$queryRaw`SELECT id FROM coursera_courses WHERE id = ${data.courseId} FOR UPDATE`;
    const course = await tx.courseraCourse.findFirst({ where: { id: data.courseId, isActive: true } });
    if (!course) throw AppError.conflict("Khóa học này hiện không nhận đơn. Vui lòng chọn khóa khác.");
    if (course.price !== expectedPrice) throw AppError.conflict("Giá khóa học đã thay đổi. Vui lòng chọn lại khóa học và xác nhận giá mới.");
    return tx.courseraOrder.create({ data: { ...order, amount: course.price, courseTitle: course.title, courseUrl: course.url ?? "" }, select: orderSelect });
  },
  async updateStatus(tx: Prisma.TransactionClient, id: number, data: CourseraStatusBody, userId?: number) {
    const result = await tx.courseraOrder.updateMany({
      where: { id, userId, status: data.expectedStatus },
      data: {
        status: data.status,
        ...(userId === undefined && { adminNote: data.adminNote }),
        ...(isCourseraTerminal(data.status) && { password: null }),
      },
    });
    if (!result.count) throw AppError.conflict("Đơn không còn ở trạng thái đã chọn. Vui lòng tải lại danh sách.");
    return tx.courseraOrder.findUniqueOrThrow({ where: { id }, select: orderSelect });
  },
  markRefunded(tx: Prisma.TransactionClient, id: number) {
    return tx.courseraOrder.update({ where: { id }, data: { refundedAt: new Date() }, select: orderSelect });
  },
  async credentials(id: number, adminId: number) {
    return prisma.$transaction(async (tx) => {
      const result = await tx.courseraOrder.updateMany({
        where: { id, status: { in: ["PENDING", "PROCESSING"] }, password: { not: null } },
        data: { credentialViewedBy: adminId, credentialViewedAt: new Date() },
      });
      if (!result.count) throw AppError.notFound("Đơn này không còn thông tin đăng nhập để xem");
      return tx.courseraOrder.findUniqueOrThrow({ where: { id }, select: { email: true, password: true } });
    });
  },
};

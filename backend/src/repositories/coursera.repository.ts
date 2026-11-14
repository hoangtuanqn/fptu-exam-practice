import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import type { CourseraCourseBody, CourseraCoursesQuery, CourseraOrdersQuery, CourseraStatusBody } from "../rules/requests/coursera.request";
import { AppError } from "../rules/error";
import { isCourseraTerminal } from "../constants/coursera";
import { toMeta, toSkipTake } from "../utils/pagination";

// Never select credentials in a list or a mutation response.
const orderSelect = {
  id: true, userId: true, courseId: true, courseTitle: true, courseUrl: true,
  email: true, note: true, status: true, adminNote: true, createdAt: true, updatedAt: true,
} satisfies Prisma.CourseraOrderSelect;

export const courseraRepository = {
  async courses(query: CourseraCoursesQuery, admin: boolean) {
    const where: Prisma.CourseraCourseWhereInput = {
      ...(!admin && { isActive: true }),
      ...(query.q && { title: { contains: query.q } }),
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
  async createOrder(data: { userId: number; courseId: number; requestKey: string; email: string; encryptedPassword: string; note: string }) {
    return prisma.$transaction(async (tx) => {
      const course = await tx.courseraCourse.findFirst({ where: { id: data.courseId, isActive: true } });
      if (!course) throw AppError.conflict("Khóa học này hiện không nhận đơn. Vui lòng chọn khóa khác.");
      return tx.courseraOrder.create({ data: { ...data, courseTitle: course.title, courseUrl: course.url }, select: orderSelect });
    });
  },
  async updateStatus(id: number, data: CourseraStatusBody, userId?: number) {
    const result = await prisma.courseraOrder.updateMany({
      where: { id, userId, status: data.expectedStatus },
      data: {
        status: data.status,
        ...(userId === undefined && { adminNote: data.adminNote }),
        ...(isCourseraTerminal(data.status) && { encryptedPassword: null }),
      },
    });
    if (!result.count) throw AppError.conflict("Đơn không còn ở trạng thái đã chọn. Vui lòng tải lại danh sách.");
    return prisma.courseraOrder.findUniqueOrThrow({ where: { id }, select: orderSelect });
  },
  async credentials(id: number, adminId: number) {
    return prisma.$transaction(async (tx) => {
      const result = await tx.courseraOrder.updateMany({
        where: { id, status: { in: ["PENDING", "PROCESSING"] }, encryptedPassword: { not: null } },
        data: { credentialViewedBy: adminId, credentialViewedAt: new Date() },
      });
      if (!result.count) throw AppError.notFound("Đơn này không còn thông tin đăng nhập để xem");
      return tx.courseraOrder.findUniqueOrThrow({ where: { id }, select: { email: true, encryptedPassword: true } });
    });
  },
};

import { prisma } from "../configs/prisma";
import type { Db } from "./wallet.repository";

export interface NewAttachment {
  name: string;
  filePath: string;
  mime: string;
  sizeBytes: number;
  sourceUrl: string;
}

export const examAttachmentRepository = {
  find: (examId: string, id: number) =>
    prisma.examAttachment.findFirst({ where: { id, examId }, select: { name: true, filePath: true } }),

  // Lấy đề / làm mới: thay toàn bộ danh sách tệp của đề trong một transaction (không trùng, không sót tệp cũ)
  replace: (examId: string, rows: NewAttachment[]) =>
    prisma.$transaction([
      prisma.examAttachment.deleteMany({ where: { examId } }),
      prisma.examAttachment.createMany({ data: rows.map((r) => ({ ...r, examId })) }),
    ]),

  // Nạp dữ liệu mới: tệp đã có của đề (để chỉ tải tệp mới, không trùng tên trên đĩa)
  listByExam: (examId: string) => prisma.examAttachment.findMany({ where: { examId }, select: { filePath: true, sourceUrl: true } }),

  // Danh sách tệp của đề cho giao diện (cùng thứ tự với GET đề)
  list: (examId: string) =>
    prisma.examAttachment.findMany({ where: { examId }, orderBy: { id: "asc" }, select: { id: true, name: true, filePath: true, mime: true, sizeBytes: true } }),

  // Xoá hết tệp của đề (ghi đè bằng thư mục mới). `db` = tx
  removeAll: (examId: string, db: Db = prisma) => db.examAttachment.deleteMany({ where: { examId } }),

  // Thêm tệp mới, giữ nguyên các tệp cũ (id không đổi). `db` = tx khi cần chung transaction với việc tạo đề
  add: (examId: string, rows: NewAttachment[], db: Db = prisma) =>
    db.examAttachment.createMany({ data: rows.map((r) => ({ ...r, examId })), skipDuplicates: true }),

  // Admin sửa một tệp (đổi tên hiển thị / thay nội dung); trả về cùng dạng với list
  update: (id: number, data: Partial<Pick<NewAttachment, "name" | "filePath" | "mime" | "sizeBytes">>) =>
    prisma.examAttachment.update({ where: { id }, data, select: { id: true, name: true, filePath: true, mime: true, sizeBytes: true } }),

  remove: (id: number) => prisma.examAttachment.delete({ where: { id }, select: { id: true } }),
};

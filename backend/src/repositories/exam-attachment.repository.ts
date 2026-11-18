import { prisma } from "../configs/prisma";

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

  // Thêm tệp mới, giữ nguyên các tệp cũ (id không đổi)
  add: (examId: string, rows: NewAttachment[]) =>
    prisma.examAttachment.createMany({ data: rows.map((r) => ({ ...r, examId })), skipDuplicates: true }),
};

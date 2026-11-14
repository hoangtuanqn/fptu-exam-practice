import { prisma } from "../configs/prisma";

export interface NewAttachment {
  name: string;
  filePath: string;
  mime: string;
  sizeBytes: number;
  sourceUrl: string;
}

export const examAttachmentRepository = {
  find: (examId: number, id: number) =>
    prisma.examAttachment.findFirst({ where: { id, examId }, select: { name: true, filePath: true } }),

  // Lấy đề / làm mới: thay toàn bộ danh sách tệp của đề trong một transaction (không trùng, không sót tệp cũ)
  replace: (examId: number, rows: NewAttachment[]) =>
    prisma.$transaction([
      prisma.examAttachment.deleteMany({ where: { examId } }),
      prisma.examAttachment.createMany({ data: rows.map((r) => ({ ...r, examId })) }),
    ]),
};

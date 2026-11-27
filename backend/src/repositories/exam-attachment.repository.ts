import { prisma } from "../configs/prisma";
import type { Db } from "./wallet.repository";

export interface NewAttachment {
  name: string;
  filePath: string;
  mime: string;
  sizeBytes: number;
  sourceUrl: string;
}

// Bình luận và lượt thích của tệp đính kèm dùng questionNumber = -id (decision 0019): xoá tệp thì xoá theo
// (thích, báo cáo của bình luận xoá theo khoá ngoại). Không có attachmentId = mọi tệp của đề.
const removeTargets = (db: Db, examId: string, attachmentId?: number) => {
  const where = { examId, questionNumber: attachmentId === undefined ? { lt: 0 } : -attachmentId };
  return [db.examComment.deleteMany({ where }), db.examQuestionLike.deleteMany({ where })];
};

export const examAttachmentRepository = {
  find: (examId: string, id: number) =>
    prisma.examAttachment.findFirst({ where: { id, examId }, select: { name: true, filePath: true } }),

  // Tệp theo id (bảng duyệt bình luận của admin: tên và ảnh của tệp được bình luận)
  byIds: (ids: number[]) =>
    ids.length ? prisma.examAttachment.findMany({ where: { id: { in: ids } }, select: { id: true, examId: true, name: true, filePath: true, mime: true, sizeBytes: true } }) : Promise.resolve([]),

  // Lấy đề / làm mới: thay toàn bộ danh sách tệp của đề trong một transaction (không trùng, không sót tệp cũ)
  replace: (examId: string, rows: NewAttachment[]) =>
    prisma.$transaction([
      ...removeTargets(prisma, examId),
      prisma.examAttachment.deleteMany({ where: { examId } }),
      prisma.examAttachment.createMany({ data: rows.map((r) => ({ ...r, examId })) }),
    ]),

  // Nạp dữ liệu mới: tệp đã có của đề (để chỉ tải tệp mới, không trùng tên trên đĩa)
  listByExam: (examId: string) => prisma.examAttachment.findMany({ where: { examId }, select: { filePath: true, sourceUrl: true } }),

  // Danh sách tệp của đề cho giao diện (cùng thứ tự với GET đề)
  list: (examId: string) =>
    prisma.examAttachment.findMany({ where: { examId }, orderBy: { id: "asc" }, select: { id: true, name: true, filePath: true, mime: true, sizeBytes: true } }),

  // Xoá hết tệp của đề (ghi đè bằng thư mục mới) cùng bình luận/thích của chúng. `db` = tx để mọi bước chung một transaction
  async removeAll(examId: string, db: Db = prisma) {
    for (const op of removeTargets(db, examId)) await op;
    return db.examAttachment.deleteMany({ where: { examId } });
  },

  // Thêm tệp mới, giữ nguyên các tệp cũ (id không đổi). `db` = tx khi cần chung transaction với việc tạo đề
  add: (examId: string, rows: NewAttachment[], db: Db = prisma) =>
    db.examAttachment.createMany({ data: rows.map((r) => ({ ...r, examId })), skipDuplicates: true }),

  // Admin sửa một tệp (đổi tên hiển thị / thay nội dung); trả về cùng dạng với list
  update: (id: number, data: Partial<Pick<NewAttachment, "name" | "filePath" | "mime" | "sizeBytes">>) =>
    prisma.examAttachment.update({ where: { id }, data, select: { id: true, name: true, filePath: true, mime: true, sizeBytes: true } }),

  // Xoá một tệp cùng bình luận/thích của nó trong một transaction
  remove: (examId: string, id: number) =>
    prisma.$transaction([...removeTargets(prisma, examId, id), prisma.examAttachment.deleteMany({ where: { id, examId } })]),
};

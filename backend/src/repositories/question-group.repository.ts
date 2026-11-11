import { prisma } from "../configs/prisma";
import { GROUP_TX_TIMEOUT_MS } from "../constants/similarity";

export const questionGroupRepository = {
  /** Xoá toàn bộ nhóm cũ của môn rồi ghi nhóm mới, tất cả trong MỘT giao dịch (lỗi giữa chừng thì giữ nguyên nhóm cũ). */
  replaceForSubject: (subjectId: number, modelName: string, threshold: number, groups: readonly (readonly number[])[]) =>
    prisma.$transaction(
      async (tx) => {
        const removed = await tx.questionGroup.deleteMany({ where: { subjectId } });
        for (const members of groups) {
          await tx.questionGroup.create({
            data: {
              subjectId,
              modelName,
              threshold,
              memberCount: members.length,
              members: { createMany: { data: members.map((questionId) => ({ subjectId, questionId })) } },
            },
            select: { id: true },
          });
        }
        return { removed: removed.count, created: groups.length };
      },
      { timeout: GROUP_TX_TIMEOUT_MS },
    ),

  /** Nhóm của môn dạng danh sách questionId (để so sánh/kiểm tra), theo thứ tự cố định. */
  membersOf: async (subjectId: number) => {
    const rows = await prisma.questionGroupMember.findMany({ where: { subjectId }, select: { groupId: true, questionId: true }, orderBy: [{ questionId: "asc" }] });
    const byGroup = new Map<number, number[]>();
    for (const r of rows) (byGroup.get(r.groupId) ?? byGroup.set(r.groupId, []).get(r.groupId)!).push(r.questionId);
    return [...byGroup.values()].sort((x, y) => x[0]! - y[0]!);
  },
};

import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { AppError } from "../rules/error";
import type { GradeSyncBody } from "../rules/requests/grade.request";
import { adviseGrade, type GradeComponent, type SyllabusAssessment } from "../utils/grade-advice";
import { buildGpaReport, GPA_TIERS, MIN_TERM_CREDITS, requiredAverage, termOrder } from "../utils/gpa";

// Điểm FAP của sinh viên: chỉ lưu khi sinh viên bật đồng bộ; tắt đồng bộ là xoá hết điểm đã lưu.
// Tiện ích trình duyệt đọc điểm trên FAP bằng phiên đăng nhập của chính sinh viên rồi website gửi lên đây; server không bao giờ gọi FAP.

const num = (d: Prisma.Decimal | null) => (d === null ? null : Number(d));

export const gradeService = {
  async setting(userId: number) {
    const s = await prisma.userGradeSetting.findUnique({ where: { userId } });
    return { enabled: !!s?.enabled, syncedAt: s?.syncedAt ?? null };
  },

  async setEnabled(userId: number, enabled: boolean) {
    await prisma.$transaction(async (tx) => {
      await tx.userGradeSetting.upsert({ where: { userId }, create: { userId, enabled }, update: { enabled } });
      if (!enabled) await tx.userGrade.deleteMany({ where: { userId } });
    });
    return this.setting(userId);
  },

  async clear(userId: number) {
    const { count } = await prisma.userGrade.deleteMany({ where: { userId } });
    return { deleted: count };
  },

  async sync(userId: number, body: GradeSyncBody) {
    const s = await prisma.userGradeSetting.findUnique({ where: { userId }, select: { enabled: true } });
    if (!s?.enabled) throw AppError.forbidden("Bạn chưa bật đồng bộ điểm ở trang Điểm FAP");
    const now = new Date();
    await prisma.$transaction([
      ...body.courses.map((c) => {
        const data = {
          subjectCode: c.subjectCode.toUpperCase(),
          subjectName: c.subjectName,
          termName: c.termName,
          classCode: c.classCode,
          status: c.status,
          average: c.average,
          components: c.components as unknown as Prisma.InputJsonValue,
          syncedAt: now,
        };
        return prisma.userGrade.upsert({ where: { userId_courseId: { userId, courseId: c.courseId } }, create: { userId, courseId: c.courseId, ...data }, update: data });
      }),
      prisma.userGradeSetting.update({ where: { userId }, data: { syncedAt: now } }),
    ]);
    return { synced: body.courses.length };
  },

  /** Các môn đã đồng bộ kèm gợi ý điểm cần đạt (môn đang học hoặc chưa qua trước) */
  async overview(userId: number) {
    const [setting, rows] = await Promise.all([this.setting(userId), prisma.userGrade.findMany({ where: { userId }, orderBy: [{ syncedAt: "desc" }, { id: "desc" }] })]);
    const subjects = await prisma.subject.findMany({ where: { code: { in: [...new Set(rows.map((r) => r.subjectCode))] } }, select: { code: true, minPassMark: true, assessments: true, credits: true } });
    const byCode = new Map(subjects.map((s) => [s.code, s]));
    const report = buildGpaReport(rows.map((r) => ({ courseId: r.courseId, subjectCode: r.subjectCode, termName: r.termName, status: r.status, average: num(r.average), credits: byCode.get(r.subjectCode)?.credits ?? null })));
    const courses = rows.map((r) => {
      const subject = byCode.get(r.subjectCode);
      const gpa = report.courses.get(r.courseId)!;
      const advice = adviseGrade(r.components as unknown as GradeComponent[], {
        minPass: num(subject?.minPassMark ?? null),
        assessments: (subject?.assessments ?? null) as SyllabusAssessment[] | null,
        fapStatus: r.status,
      });
      return {
        courseId: r.courseId,
        subjectCode: r.subjectCode,
        subjectName: r.subjectName,
        termName: r.termName,
        classCode: r.classCode,
        status: r.status,
        average: num(r.average),
        syllabusKnown: !!subject?.minPassMark,
        advice,
        credits: gpa.credits,
        creditsKnown: gpa.creditsKnown,
        attempt: gpa.attempt,
        kind: gpa.kind,
        counted: gpa.counted,
        note: gpa.note,
      };
    });

    // Danh hiệu (Xuất sắc/Giỏi) xét theo điểm trung bình TỪNG KỲ; GPA tích lũy chỉ để tham khảo cho lúc ra trường.
    // Kỳ gần nhất: còn môn đang học thì tính điểm trung bình cần ở các môn đó để chạm từng mức.
    const { cumulative } = report;
    const cur = report.terms[0] ?? null;
    const tiers = GPA_TIERS.map((t) => {
      const blocked = !cur ? null : cur.failedCount > 0 ? "Kỳ này có môn trượt nên không xét danh hiệu" : cur.registeredCredits < MIN_TERM_CREDITS ? `Kỳ này chưa đủ ${MIN_TERM_CREDITS} tín chỉ tối thiểu` : null;
      const reached = !blocked && !!cur && cur.gpa !== null && cur.studyingCredits === 0 && cur.gpa >= t.min;
      return {
        blocked,
        key: t.key,
        label: t.label,
        min: t.min,
        reached,
        needAverage: cur && !blocked && !reached && cur.studyingCredits > 0 ? requiredAverage(cur.gpa, cur.credits, cur.studyingCredits, t.min) : null,
      };
    });
    const currentTerm = cur && { termName: cur.termName, gpa: cur.gpa, credits: cur.credits, studyingCredits: cur.studyingCredits };
    const terms = report.terms.map((t) => ({ ...t, courses: courses.filter((c) => c.termName === t.termName).sort((a, b) => a.subjectCode.localeCompare(b.subjectCode)) }));
    terms.sort((a, b) => termOrder(b.termName) - termOrder(a.termName));
    return { ...setting, courses, terms, cumulative, currentTerm, tiers };
  },
};

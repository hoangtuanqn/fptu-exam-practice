import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { AppError } from "../rules/error";
import type { GradeSyncBody } from "../rules/requests/grade.request";
import { adviseGrade, type GradeComponent, type SyllabusAssessment } from "../utils/grade-advice";
import { buildGpaReport, GPA_TIERS, requiredAverage, termOrder } from "../utils/gpa";

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

    // GPA tích lũy và từng mức xếp loại: còn thiếu bao nhiêu, kỳ này cần trung bình bao nhiêu để chạm mức đó
    const { cumulative } = report;
    const tiers = GPA_TIERS.map((t) => ({
      key: t.key,
      label: t.label,
      min: t.min,
      reached: cumulative.gpa !== null && cumulative.gpa >= t.min,
      needAverage: cumulative.gpa !== null && cumulative.gpa >= t.min ? null : requiredAverage(cumulative.gpa, cumulative.credits, cumulative.studyingCredits, t.min),
    }));
    const terms = report.terms.map((t) => ({ ...t, courses: courses.filter((c) => c.termName === t.termName).sort((a, b) => a.subjectCode.localeCompare(b.subjectCode)) }));
    terms.sort((a, b) => termOrder(b.termName) - termOrder(a.termName));
    return { ...setting, courses, terms, cumulative, tiers };
  },
};

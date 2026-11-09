import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { AppError } from "../rules/error";
import type { GradeSyncBody } from "../rules/requests/grade.request";
import { adviseGrade, type GradeComponent, type MockStats, type SyllabusAssessment } from "../utils/grade-advice";
import { buildGpaReport, GPA_TIERS, MIN_TERM_CREDITS, requiredAverage, termOrder } from "../utils/gpa";

// Điểm FAP của sinh viên: chỉ lưu khi sinh viên bật đồng bộ; tắt đồng bộ là xoá hết điểm đã lưu.
// Tiện ích trình duyệt đọc điểm trên FAP bằng phiên đăng nhập của chính sinh viên rồi website gửi lên đây; server không bao giờ gọi FAP.

const num = (d: Prisma.Decimal | null) => (d === null ? null : Number(d));
const MOCK_WINDOW = 5; // số bài thi thử gần nhất của mỗi môn được xét (giống mức sẵn sàng)

/** Điểm các bài THI THỬ (không tính luyện tập, vì luyện tập xem đáp án ngay) gần nhất của từng môn */
async function mockStatsFor(userId: number, codes: string[]): Promise<Map<string, MockStats>> {
  const out = new Map<string, MockStats>();
  if (codes.length === 0) return out;
  const rows = await prisma.examAttempt.findMany({
    where: { userId, mode: "EXAM", totalGraded: { gt: 0 }, exam: { subjectCode: { in: codes } } },
    orderBy: { id: "desc" },
    take: 100,
    select: { score: true, exam: { select: { subjectCode: true } } },
  });
  const by = new Map<string, number[]>();
  for (const r of rows) {
    const code = r.exam.subjectCode;
    if (!code) continue;
    const list = by.get(code) ?? by.set(code, []).get(code)!;
    if (list.length < MOCK_WINDOW) list.push(r.score);
  }
  for (const [code, scores] of by) {
    const n = scores.length;
    const average = scores.reduce((a, b) => a + b, 0) / n;
    const spread = Math.sqrt(scores.reduce((a, b) => a + (b - average) ** 2, 0) / n);
    out.set(code, { n, average: Math.round(average * 100) / 100, spread: Math.round(spread * 100) / 100 });
  }
  return out;
}

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
    const mocks = await mockStatsFor(userId, [...new Set(rows.filter((r) => r.status === "studying").map((r) => r.subjectCode))]);
    const advices = new Map(
      rows.map((r) => {
        const subject = byCode.get(r.subjectCode);
        return [
          r.courseId,
          adviseGrade(r.components as unknown as GradeComponent[], {
            minPass: num(subject?.minPassMark ?? null),
            assessments: (subject?.assessments ?? null) as SyllabusAssessment[] | null,
            fapStatus: r.status,
            mock: r.status === "studying" ? (mocks.get(r.subjectCode) ?? null) : null,
          }),
        ] as const;
      }),
    );
    const report = buildGpaReport(
      rows.map((r) => {
        const a = advices.get(r.courseId)!;
        return {
          courseId: r.courseId,
          subjectCode: r.subjectCode,
          termName: r.termName,
          status: r.status,
          average: num(r.average),
          credits: byCode.get(r.subjectCode)?.credits ?? null,
          projected: r.status === "studying" && a.projected !== null ? { score: a.projected, pass: a.projectedPass, low: a.projectedLow, high: a.projectedHigh } : null,
        };
      }),
    );
    const courses = rows.map((r) => {
      const subject = byCode.get(r.subjectCode);
      const gpa = report.courses.get(r.courseId)!;
      const advice = advices.get(r.courseId)!;
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
        projected: r.status === "studying" ? advice.projected : null,
        projectedPass: advice.projectedPass,
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
      const blocked = !cur ? null : cur.projectedFailCount > 0 ? "Có môn trượt hoặc dự đoán không qua nên không đủ điều kiện" : cur.registeredCredits < MIN_TERM_CREDITS ? `Kỳ này chưa đủ ${MIN_TERM_CREDITS} tín chỉ tối thiểu` : null;
      const meets = !blocked && !!cur && cur.projectedGpa !== null && cur.projectedGpa >= t.min;
      const reached = !blocked && !!cur && cur.gpa !== null && cur.studyingCredits === 0 && cur.gpa >= t.min;
      return {
        blocked,
        meets, // đạt theo điểm dự kiến (đã đạt nếu kỳ đã xong)
        gap: cur && !blocked && !meets && cur.projectedGpa !== null ? Math.round((t.min - cur.projectedGpa) * 100) / 100 : null,
        key: t.key,
        label: t.label,
        min: t.min,
        reached,
        needAverage: cur && !blocked && !reached && cur.studyingCredits > 0 ? requiredAverage(cur.gpa, cur.credits, cur.studyingCredits, t.min) : null,
      };
    });
    const currentTerm = cur && { termName: cur.termName, gpa: cur.gpa, credits: cur.credits, studyingCredits: cur.studyingCredits, projectedGpa: cur.projectedGpa, projectedLow: cur.projectedLow, projectedHigh: cur.projectedHigh, predictedCredits: cur.predictedCredits, unpredictedCredits: cur.unpredictedCredits };
    const terms = report.terms.map((t) => ({ ...t, courses: courses.filter((c) => c.termName === t.termName).sort((a, b) => a.subjectCode.localeCompare(b.subjectCode)) }));
    terms.sort((a, b) => termOrder(b.termName) - termOrder(a.termName));
    return { ...setting, courses, terms, cumulative, currentTerm, tiers };
  },
};

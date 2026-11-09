import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/shared/hooks/useApi";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { buttonClass } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { gradeApi, type GradeCourse } from "./grade.api";
import { GradeSyncCard } from "./GradeSyncCard";

const STATUS: Record<GradeCourse["status"], { label: string; tone: Tone }> = {
  studying: { label: "Đang học", tone: "info" },
  passed: { label: "Đã qua", tone: "success" },
  failed: { label: "Chưa qua", tone: "danger" },
  unknown: { label: "Chưa rõ", tone: "neutral" },
};

const fmt = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

// "Fall2026" -> số để xếp học kỳ mới trước
const termRank = (t: string) => {
  const m = t.match(/(Spring|Summer|Fall)\s*(\d{4})/i);
  return m ? Number(m[2]) * 10 + ({ spring: 1, summer: 2, fall: 3 }[m[1]!.toLowerCase() as "spring"] ?? 0) : 0;
};

// Mỗi môn chỉ hiện lần học gần nhất (học lại thì lấy kỳ sau)
function latestPerSubject(courses: GradeCourse[]) {
  const best = new Map<string, GradeCourse>();
  for (const c of courses) {
    const cur = best.get(c.subjectCode);
    if (!cur || termRank(c.termName) > termRank(cur.termName)) best.set(c.subjectCode, c);
  }
  const order = { need: 0, resit: 0, impossible: 1, waiting: 2, failed: 1, passed: 3 } as const;
  return [...best.values()].sort((a, b) => order[a.advice.state] - order[b.advice.state] || termRank(b.termName) - termRank(a.termName));
}

function Advice({ c }: { c: GradeCourse }) {
  const a = c.advice;
  const final = a.final;
  const finalName = final?.group ?? "bài thi cuối kỳ";
  const pe = a.practical && a.practical.score === null ? ` Môn có thi thực hành (${fmt(a.practical.weight)}%): điểm này cũng ảnh hưởng, tính theo mức trung bình các phần bạn đã có.` : "";
  switch (a.state) {
    case "passed":
      return <p className="md-body-medium text-on-surface-variant">Bạn đã qua môn{c.average !== null ? ` với điểm trung bình ${fmt(c.average)}` : ""}.</p>;
    case "need":
      return (
        <div className="space-y-1">
          <p className="md-title-small text-on-surface">
            Cần ≥ <span className="text-primary">{fmt(a.neededFinal ?? 0)}</span> điểm ở {finalName} ({fmt(final?.weight ?? 0)}%) để đạt trung bình ≥ {fmt(a.minPass)}.
          </p>
          <p className="md-body-small text-on-surface-variant">
            Hiện đã tích lũy {fmt(a.earned)} điểm từ {fmt(a.gradedWeight)}% trọng số.{final?.minScore ? ` Syllabus yêu cầu ${finalName} tối thiểu ${fmt(final.minScore)}.` : ""}
            {pe}
          </p>
        </div>
      );
    case "resit":
      return (
        <div className="space-y-1">
          <p className="md-title-small text-on-surface">
            Chưa qua môn. Thi lại cần ≥ <span className="text-primary">{fmt(a.neededFinal ?? 0)}</span> điểm ở {finalName} ({fmt(final?.weight ?? 0)}%).
          </p>
          <p className="md-body-small text-on-surface-variant">Điểm thi lại thay cho điểm lần trước.{pe}</p>
        </div>
      );
    case "impossible":
      return <p className="md-body-medium text-on-surface-variant">Với điểm hiện tại, dù thi {finalName} 10 điểm cũng khó đạt trung bình {fmt(a.minPass)}. Cân nhắc học lại môn này.</p>;
    default:
      return <p className="md-body-medium text-on-surface-variant">Chưa đủ điểm thành phần để gợi ý. Có điểm trên FAP rồi, tiện ích sẽ cập nhật.</p>;
  }
}

function CourseCard({ c }: { c: GradeCourse }) {
  const s = STATUS[c.status];
  const practise = c.advice.state === "need" || c.advice.state === "resit";
  return (
    <Card>
      <div className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="md-title-medium text-on-surface">
              {c.subjectCode} <span className="md-body-medium text-on-surface-variant">· {c.subjectName}</span>
            </p>
            <p className="md-body-small text-on-surface-variant">{c.termName}{c.classCode ? ` · ${c.classCode}` : ""}</p>
          </div>
          <Badge tone={s.tone}>{s.label}</Badge>
        </div>
        <Advice c={c} />
        {!c.syllabusKnown && <p className="md-body-small text-on-surface-variant">Chưa có syllabus của môn này nên tạm dùng ngưỡng qua môn {fmt(c.advice.minPass)}.</p>}
        {practise && (
          <Link to={`/account/exams?tab=subject&subject=${encodeURIComponent(c.subjectCode)}`} className={buttonClass({ variant: "primary", size: "sm" })}>
            Luyện đề {c.subjectCode}
          </Link>
        )}
      </div>
    </Card>
  );
}

export default function GradesPage() {
  const query = useApi(() => gradeApi.overview(), []);
  return (
    <div>
      <PageHeader title="Điểm FAP" eyebrow="Cá nhân hoá" description="Điểm cần đạt ở bài thi cuối kỳ (FE) để qua từng môn, tính từ điểm thành phần của bạn trên FAP." />
      <QueryBoundary query={query}>
        {(data) => <Body data={data} reload={query.reload} />}
      </QueryBoundary>
    </div>
  );
}

function Body({ data, reload }: { data: Awaited<ReturnType<typeof gradeApi.overview>>; reload: () => void }) {
  const courses = useMemo(() => latestPerSubject(data.courses), [data.courses]);
  return (
    <div className="space-y-6">
      <GradeSyncCard overview={data} onChange={reload} />
      {data.enabled && (
        <Card>
          <CardHeader title="Gợi ý theo từng môn" description={data.syncedAt ? `Đồng bộ lần cuối: ${new Date(data.syncedAt).toLocaleString("vi-VN")}` : undefined} />
          <div className="space-y-3 p-5">
            {courses.length === 0 ? <Empty title="Chưa có điểm nào">Mở Báo cáo điểm trên FAP (đã cài tiện ích) để đồng bộ.</Empty> : courses.map((c) => <CourseCard key={c.courseId} c={c} />)}
          </div>
        </Card>
      )}
    </div>
  );
}

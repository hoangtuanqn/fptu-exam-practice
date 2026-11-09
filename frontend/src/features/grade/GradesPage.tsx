import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/shared/hooks/useApi";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { buttonClass } from "@/shared/ui/Button";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { gradeApi, type ExamSlot, type GradeCourse, type GradeOverview, type GradeTerm } from "./grade.api";
import { ExamSchedule, examLinesFor } from "./ExamSchedule";
import { GradeSyncCard } from "./GradeSyncCard";

const fmt = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");
const TIER_LABEL: Record<string, string> = { excellent: "Sinh viên Xuất sắc", good: "Sinh viên Giỏi" };
const MIN_CREDITS = 12;

// "Fall2026" -> số để so sánh học kỳ
const termRank = (t: string) => {
  const m = t.match(/(Spring|Summer|Fall)\s*(\d{4})/i);
  return m ? Number(m[2]) * 10 + ({ spring: 1, summer: 2, fall: 3 }[m[1]!.toLowerCase() as "spring"] ?? 0) : 0;
};

// ---- Một môn: tên, một câu "cần làm gì", và kết quả ở bên phải
function headline(c: GradeCourse): { text: string; tone: "ok" | "warn" | "bad" | "muted" } {
  const a = c.advice;
  const fe = a.final?.group ?? "bài thi cuối kỳ";
  switch (a.state) {
    case "passed":
      return { text: "Đã qua môn", tone: "ok" };
    case "need":
      return { text: `Cần ≥ ${fmt(a.neededFinal ?? 0)} điểm ${fe} để qua môn`, tone: "warn" };
    case "resit":
      return { text: `Thi lại cần ≥ ${fmt(a.neededFinal ?? 0)} điểm ${fe}`, tone: "bad" };
    case "impossible":
      return { text: "Khó qua môn lần này, cân nhắc học lại", tone: "bad" };
    default:
      return { text: c.status === "studying" ? "Chưa có điểm thành phần nào" : "", tone: "muted" };
  }
}

const TONE_TEXT = { ok: "text-success", warn: "text-primary", bad: "text-error", muted: "text-on-surface-variant" } as const;

function Detail({ c }: { c: GradeCourse }) {
  const a = c.advice;
  const lines: string[] = [];
  if (a.gradedWeight > 0) lines.push(`Đã có ${fmt(a.gradedWeight)}% trọng số, tích lũy ${fmt(a.earned)} điểm.`);
  if (a.pendingWeight > 0) lines.push(`${fmt(a.pendingWeight)}% trọng số chưa có điểm, tạm tính bằng mức trung bình hiện tại (${fmt(a.assumedOthers ?? a.minPass)}).`);
  if (a.final?.minScore) lines.push(`${a.final.group} tối thiểu ${fmt(a.final.minScore)} (điểm liệt).`);
  if (a.practical) lines.push(`Có thi thực hành (${fmt(a.practical.weight)}%), tối thiểu ${fmt(a.practical.minScore ?? 1)}.`);
  lines.push(`Qua môn khi trung bình ≥ ${fmt(a.minPass)}${c.syllabusKnown ? "" : " (chưa có syllabus, dùng ngưỡng mặc định)"}.`);
  if (!c.creditsKnown) lines.push("Chưa có số tín chỉ nên môn này chưa tính vào điểm TB kỳ.");
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-primary">Chi tiết</summary>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-on-surface-variant">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </details>
  );
}

function CourseCard({ c, latest, exams }: { c: GradeCourse; latest: boolean; exams: ExamSlot[] }) {
  const h = latest ? headline(c) : { text: "", tone: "muted" as const };
  const examLines = latest ? examLinesFor(exams, c.subjectCode, c.advice.state === "resit") : [];
  const studying = c.status === "studying";
  const practise = latest && (c.advice.state === "need" || c.advice.state === "resit");
  const result = studying
    ? c.projected !== null
      ? { label: "Dự kiến", value: fmt(c.projected), tone: (c.projectedPass ? "info" : "danger") as Tone }
      : null
    : c.average !== null
      ? { label: c.status === "passed" ? "Đã qua" : "Chưa qua", value: fmt(c.average), tone: (c.status === "passed" ? "success" : "danger") as Tone }
      : null;
  return (
    <div className="rounded-m3-lg border border-outline-variant bg-surface-container-lowest p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="md-title-small truncate text-on-surface">
            {c.subjectCode} <span className="md-body-medium text-on-surface-variant">· {c.subjectName}</span>
          </p>
          <p className="md-body-small flex flex-wrap items-center gap-x-2 text-on-surface-variant">
            <span>{c.creditsKnown ? `${c.credits} tín chỉ` : "Chưa có số tín chỉ"}</span>
            {c.kind !== "first" && <Badge tone="warning">{c.kind === "retake" ? "Học lại" : "Học cải thiện"}</Badge>}
            {c.note === "excluded" && <Badge tone="neutral">Không tính điểm TB</Badge>}
          </p>
        </div>
        {result && (
          <div className="shrink-0 text-right">
            <p className="md-headline-small text-on-surface">{result.value}</p>
            <Badge tone={result.tone}>{result.label}</Badge>
          </div>
        )}
      </div>
      {h.text && <p className={`md-title-small mt-2 ${TONE_TEXT[h.tone]}`}>{h.text}</p>}
      {examLines.map((l) => (
        <p key={l} className="md-body-small mt-1 text-on-surface-variant">
          {l}
        </p>
      ))}
      {latest && studying && <Detail c={c} />}
      {practise && (
        <Link to={`/account/exams?tab=subject&subject=${encodeURIComponent(c.subjectCode)}`} className={`${buttonClass({ variant: "primary", size: "sm" })} mt-3`}>
          Luyện đề {c.subjectCode}
        </Link>
      )}
    </div>
  );
}

// ---- Tổng kết một kỳ: điểm TB + hai danh hiệu, mỗi cái một ô
function TierBox({ label, min, ok, text }: { label: string; min: number; ok: boolean; text: string }) {
  const color = ok ? "border-success bg-success-container text-on-success-container" : "border-outline-variant bg-surface-container-lowest text-on-surface-variant";
  return (
    <div className={`rounded-m3-lg border p-3 ${color}`}>
      <p className="md-label-large">
        {label} <span className="opacity-70">(TB kỳ ≥ {fmt(min)})</span>
      </p>
      <p className="md-title-small mt-0.5">{text}</p>
    </div>
  );
}

function Conditions() {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-on-surface-variant">Điều kiện xét danh hiệu kỳ</summary>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-on-surface-variant">
        <li>Điểm TB kỳ từ 8 (Giỏi) hoặc từ 9 (Xuất sắc).</li>
        <li>Qua 100% các môn trong kỳ.</li>
        <li>Đủ số tín chỉ tối thiểu của kỳ (thường từ {MIN_CREDITS}).</li>
        <li>Không bị kỷ luật (FePass không biết điều này, bạn tự đối chiếu).</li>
        <li>Môn trượt tính 0 điểm nhưng vẫn cộng tín chỉ. Môn chưa có trong syllabus, tiếng Anh chuẩn bị, Vovinam, thể chất, OJT không tính.</li>
      </ul>
    </details>
  );
}

function LatestSummary({ data }: { data: GradeOverview }) {
  const cur = data.currentTerm;
  if (!cur) return null;
  const done = cur.studyingCredits === 0;
  const blocked = data.tiers.find((t) => t.blocked)?.blocked ?? null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <div>
          <p className="md-label-medium text-on-surface-variant">{done ? "Điểm trung bình kỳ" : "Điểm trung bình kỳ (dự kiến)"}</p>
          <p className="md-display-small text-primary">{cur.projectedGpa === null ? "–" : fmt(cur.projectedGpa)}</p>
        </div>
        <p className="md-body-small max-w-md pb-2 text-on-surface-variant">
          {cur.projectedGpa === null
            ? "Chưa có điểm nào để tính."
            : done
              ? "Tính từ các môn đã tổng kết."
              : "Tính từ điểm đã có; phần chưa thi lấy theo mức hiện tại (FE không dưới 4, PE không dưới 1). Số này đổi khi có thêm điểm."}
          {cur.unpredictedCredits > 0 ? ` ${cur.unpredictedCredits} tín chỉ chưa có điểm nào nên chưa tính.` : ""}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {data.tiers
          .slice()
          .reverse()
          .map((t) => (
            <TierBox
              key={t.key}
              label={`Sinh viên ${t.label}`}
              min={t.min}
              ok={t.meets}
              text={blocked ? "Chưa đủ điều kiện" : t.meets ? (done ? "Đã đạt" : "Dự kiến đạt") : t.gap !== null ? `Dự kiến còn thiếu ${fmt(t.gap)} điểm` : "Chưa có điểm để dự kiến"}
            />
          ))}
      </div>
      {blocked && <p className="md-body-small text-error">{blocked}.</p>}
      <Conditions />
    </div>
  );
}

function PastSummary({ term }: { term: GradeTerm }) {
  const reason = term.failedCount > 0 ? "có môn trượt" : term.registeredCredits < MIN_CREDITS ? `chưa đủ ${MIN_CREDITS} tín chỉ` : null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
        <div>
          <p className="md-label-medium text-on-surface-variant">Điểm trung bình kỳ</p>
          <p className="md-display-small text-primary">{term.gpa === null ? "–" : fmt(term.gpa)}</p>
        </div>
        <div className="pb-2">
          {term.tier ? <Badge tone="success">{TIER_LABEL[term.tier]}</Badge> : <span className="md-body-medium text-on-surface-variant">Không đạt danh hiệu kỳ{reason ? ` (${reason})` : ""}</span>}
        </div>
      </div>
      <Conditions />
    </div>
  );
}

function Body({ data, reload }: { data: GradeOverview; reload: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const selected = data.terms.find((t) => t.termName === picked) ?? data.terms[0];
  const isLatest = !!selected && selected === data.terms[0];
  // Môn có lần học sau thì lần học này không cần gợi ý nữa
  const laterOf = (c: GradeCourse) => data.courses.some((o) => o.subjectCode === c.subjectCode && termRank(o.termName) > termRank(c.termName));

  return (
    <div className="space-y-4">
      <GradeSyncCard overview={data} onChange={reload} />
      {data.enabled && <ExamSchedule exams={data.exams} />}
      {data.enabled &&
        (!selected ? (
          <Card>
            <div className="p-5">
              <Empty title="Chưa có điểm nào">Mở Báo cáo điểm trên FAP (đã cài tiện ích) để đồng bộ.</Empty>
            </div>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Học kỳ">
              {data.terms.map((t) => (
                <button
                  key={t.termName}
                  role="tab"
                  aria-selected={t === selected}
                  onClick={() => setPicked(t.termName)}
                  className={`md-label-large rounded-full border px-4 py-1.5 transition ${t === selected ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest text-on-surface hover:bg-surface-container"}`}
                >
                  {t.termName}
                </button>
              ))}
            </div>
            <Card>
              <div className="space-y-5 p-5">
                {isLatest ? <LatestSummary data={data} /> : <PastSummary term={selected!} />}
                <div className="space-y-3">
                  <h2 className="md-title-medium text-on-surface">Các môn kỳ {selected!.termName}</h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {selected!.courses.map((c) => (
                      <CourseCard key={c.courseId} c={c} latest={!laterOf(c)} exams={data.exams} />
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </>
        ))}
    </div>
  );
}

export default function GradesPage() {
  const query = useApi(() => gradeApi.overview(), []);
  return (
    <div>
      <PageHeader title="Điểm FAP" description="Chọn học kỳ để xem điểm trung bình, danh hiệu và điểm cần đạt ở từng môn." />
      <QueryBoundary query={query}>{(data) => <Body data={data} reload={query.reload} />}</QueryBoundary>
    </div>
  );
}

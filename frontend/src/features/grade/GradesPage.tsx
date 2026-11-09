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
  const fp = a.finalPrediction;
  // Gộp các cột điểm cùng nhóm thành một dòng (Lab 1..6 -> Labs)
  const groups = new Map<string, { weight: number; points: number; predicted: boolean }>();
  for (const r of a.breakdown) {
    const g = groups.get(r.group) ?? { weight: 0, points: 0, predicted: false };
    g.weight += r.weight;
    g.points += (r.weight * r.value) / 100;
    g.predicted ||= r.predicted;
    groups.set(r.group, g);
  }
  const notes: string[] = [];
  if (a.final?.minScore) notes.push(`${a.final.group} tối thiểu ${fmt(a.final.minScore)} (điểm liệt).`);
  if (a.practical) notes.push(`Có thi thực hành (${fmt(a.practical.weight)}%), tối thiểu ${fmt(a.practical.minScore ?? 1)}.`);
  notes.push(`Qua môn khi điểm môn ≥ ${fmt(a.minPass)}${c.syllabusKnown ? "" : " (chưa có syllabus, dùng ngưỡng mặc định)"}.`);
  if (!c.creditsKnown) notes.push("Chưa có số tín chỉ nên môn này chưa tính vào điểm TB kỳ.");
  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-primary">Cách ra điểm dự kiến</summary>
      <div className="mt-2 space-y-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="md-label-medium text-on-surface-variant">
                <th className="py-1 pr-3 font-medium">Phần điểm</th>
                <th className="py-1 pr-3 font-medium">Trọng số</th>
                <th className="py-1 pr-3 font-medium">Điểm</th>
                <th className="py-1 font-medium">Đóng góp</th>
              </tr>
            </thead>
            <tbody>
              {[...groups.entries()].map(([name, g]) => (
                <tr key={name} className="border-t border-outline-variant">
                  <td className="py-1 pr-3 text-on-surface">{name}</td>
                  <td className="py-1 pr-3">{fmt(g.weight)}%</td>
                  <td className={`py-1 pr-3 ${g.predicted ? "italic text-primary" : ""}`}>
                    {g.predicted ? "~" : ""}
                    {fmt((g.points * 100) / g.weight)}
                  </td>
                  <td className="py-1">{fmt(g.points)}</td>
                </tr>
              ))}
              <tr className="border-t border-outline-variant font-medium text-on-surface">
                <td className="py-1 pr-3" colSpan={3}>
                  Điểm môn dự kiến
                </td>
                <td className="py-1">{a.projected === null ? "–" : fmt(a.projected)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-on-surface-variant">Dấu ~ là điểm dự đoán cho phần chưa có điểm. Điểm môn = tổng (trọng số × điểm) ÷ 100.</p>
        {fp && (
          <div className="rounded-m3-md bg-surface-container px-3 py-2 text-on-surface-variant">
            <p className="font-medium text-on-surface">
              Dự đoán {a.final?.group ?? "bài thi cuối kỳ"}: {fmt(fp.value)}
            </p>
            {fp.mock ? (
              <p>
                Dự đoán dựa {Math.round(fp.mockWeight * 100)}% vào {fp.mock.n} bài thi thử gần nhất trên FePass (trung bình {fmt(fp.mock.average)}) và {100 - Math.round(fp.mockWeight * 100)}% vào điểm các phần đã có ({fmt(fp.base)}).
                {fp.value <= fp.floor ? ` Không dưới điểm liệt ${fmt(fp.floor)}.` : ""}
                <br />
                Công thức: (1 − {fmt(fp.mockWeight)}) × {fmt(fp.base)} + {fmt(fp.mockWeight)} × {fmt(fp.mock.average)} = {fmt(fp.value)}, với tỉ lệ thi thử = n ÷ (n + 3), tối đa 0,7 (n là số bài thi thử).
                {a.projectedLow !== null && a.projectedHigh !== null ? ` Khoảng dự kiến ${fmt(a.projectedLow)} đến ${fmt(a.projectedHigh)} lấy theo độ lệch của các bài thi thử.` : ""}
              </p>
            ) : (
              <p>
                Chưa có bài thi thử nào nên lấy bằng điểm trung bình các phần đã có ({fmt(fp.base)}), không dưới điểm liệt {fmt(fp.floor)}.
              </p>
            )}
            {(!fp.mock || fp.mock.n < 2) && (
              <Link to={`/account/exams?tab=subject&subject=${encodeURIComponent(c.subjectCode)}`} className="mt-1 inline-block text-primary underline">
                Làm thêm đề thi thử {c.subjectCode} để dự đoán sát hơn
              </Link>
            )}
          </div>
        )}
        <ul className="list-disc space-y-0.5 pl-5 text-on-surface-variant">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
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
            {studying && c.advice.projectedLow !== null && c.advice.projectedHigh !== null && (
              <p className="md-body-small mt-0.5 text-on-surface-variant">
                {fmt(c.advice.projectedLow)} – {fmt(c.advice.projectedHigh)}
              </p>
            )}
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

function Formula({ term }: { term: GradeTerm }) {
  const rows = term.courses.map((c) => {
    if (c.note === "excluded") return { c, credits: 0, value: null as number | null, label: "Không tính điểm TB" };
    if (!c.creditsKnown) return { c, credits: 0, value: null, label: "Chưa có số tín chỉ nên chưa tính" };
    if (c.status === "studying") {
      if (c.projected === null) return { c, credits: 0, value: null, label: "Chưa có điểm nào nên chưa tính" };
      return c.projectedPass ? { c, credits: c.credits, value: c.projected, label: "Dự kiến" } : { c, credits: c.credits, value: 0, label: "Dự đoán chưa qua nên tính 0" };
    }
    if (c.status === "failed") return { c, credits: c.credits, value: 0, label: "Trượt, tính 0" };
    if (c.status === "passed" && c.average !== null) return { c, credits: c.credits, value: c.average, label: "Đã tổng kết" };
    return { c, credits: 0, value: null, label: "Chưa rõ" };
  });
  const used = rows.filter((r) => r.value !== null);
  const total = used.reduce((n, r) => n + r.credits, 0);
  const points = used.reduce((n, r) => n + r.credits * (r.value as number), 0);
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-on-surface-variant">Cách tính điểm TB kỳ</summary>
      <div className="mt-2 space-y-2 text-on-surface-variant">
        <p>Điểm TB kỳ = tổng (tín chỉ × điểm môn) ÷ tổng tín chỉ. Môn trượt tính 0 nhưng vẫn cộng tín chỉ.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="md-label-medium">
                <th className="py-1 pr-3 font-medium">Môn</th>
                <th className="py-1 pr-3 font-medium">Tín chỉ</th>
                <th className="py-1 pr-3 font-medium">Điểm dùng</th>
                <th className="py-1 font-medium">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.c.courseId} className="border-t border-outline-variant">
                  <td className="py-1 pr-3 text-on-surface">{r.c.subjectCode}</td>
                  <td className="py-1 pr-3">{r.value === null ? "–" : r.credits}</td>
                  <td className="py-1 pr-3">{r.value === null ? "–" : fmt(r.value)}</td>
                  <td className="py-1">{r.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <p className="font-medium text-on-surface">
            = {fmt(points)} ÷ {total} = {fmt(points / total)}
          </p>
        )}
      </div>
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
          {!done && cur.projectedLow !== null && cur.projectedHigh !== null && (
            <p className="md-body-small text-on-surface-variant">
              khoảng {fmt(cur.projectedLow)} – {fmt(cur.projectedHigh)}
            </p>
          )}
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
      <Formula term={data.terms[0]!} />
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

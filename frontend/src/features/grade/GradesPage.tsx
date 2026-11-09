import { Link } from "react-router-dom";
import { useApi } from "@/shared/hooks/useApi";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { buttonClass } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { gradeApi, type GradeCourse, type GradeOverview, type GradeTerm } from "./grade.api";
import { GradeSyncCard } from "./GradeSyncCard";

const STATUS: Record<GradeCourse["status"], { label: string; tone: Tone }> = {
  studying: { label: "Đang học", tone: "info" },
  passed: { label: "Đã qua", tone: "success" },
  failed: { label: "Chưa qua", tone: "danger" },
  unknown: { label: "Chưa rõ", tone: "neutral" },
};
const TIER_LABEL: Record<string, string> = { excellent: "Sinh viên Xuất sắc", good: "Sinh viên Giỏi" };
const KIND_LABEL = { retake: "Học lại", improve: "Học cải thiện" } as const;

const fmt = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

// "Fall2026" -> số để so sánh học kỳ
const termRank = (t: string) => {
  const m = t.match(/(Spring|Summer|Fall)\s*(\d{4})/i);
  return m ? Number(m[2]) * 10 + ({ spring: 1, summer: 2, fall: 3 }[m[1]!.toLowerCase() as "spring"] ?? 0) : 0;
};

function Advice({ c }: { c: GradeCourse }) {
  const a = c.advice;
  const final = a.final;
  const finalName = final?.group ?? "bài thi cuối kỳ";
  const pe = a.practical && a.practical.score === null ? ` Môn có thi thực hành (${fmt(a.practical.weight)}%) nên điểm phần này cũng ảnh hưởng; mình tạm tính theo mức trung bình các phần bạn đã có.` : "";
  switch (a.state) {
    case "need":
      return (
        <div className="space-y-1">
          <p className="md-title-small text-on-surface">
            Cần ≥ <span className="text-primary">{fmt(a.neededFinal ?? 0)}</span> điểm ở {finalName} ({fmt(final?.weight ?? 0)}%) để đạt trung bình ≥ {fmt(a.minPass)}.
          </p>
          <p className="md-body-small text-on-surface-variant">
            Đã tích lũy {fmt(a.earned)} điểm từ {fmt(a.gradedWeight)}% trọng số.{final?.minScore ? ` Syllabus yêu cầu ${finalName} tối thiểu ${fmt(final.minScore)}.` : ""}
            {pe}
            {a.pendingWeight > 0 ? ` Còn ${fmt(a.pendingWeight)}% trọng số chưa có điểm, mình tạm tính bằng mức trung bình hiện tại của bạn (${fmt(a.assumedOthers ?? a.minPass)}).` : ""}
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
    case "waiting":
      return c.status === "studying" ? <p className="md-body-small text-on-surface-variant">Chưa đủ điểm thành phần để gợi ý. Có điểm trên FAP rồi, tiện ích sẽ cập nhật.</p> : null;
    default:
      return null;
  }
}

function CourseRow({ c, latest }: { c: GradeCourse; latest: boolean }) {
  const s = STATUS[c.status];
  const practise = latest && (c.advice.state === "need" || c.advice.state === "resit");
  return (
    <div className="space-y-2 border-t border-outline-variant px-5 py-4 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="md-title-small text-on-surface">
            {c.subjectCode} <span className="md-body-medium text-on-surface-variant">· {c.subjectName}</span>
          </p>
          <p className="md-body-small text-on-surface-variant">
            {c.creditsKnown ? `${c.credits} tín chỉ` : "Chưa có số tín chỉ (chưa tính vào điểm)"}
            {c.classCode ? ` · ${c.classCode}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {c.kind !== "first" && <Badge tone="warning">{KIND_LABEL[c.kind]}</Badge>}
          {c.note === "superseded" && <Badge tone="neutral">Không tính (có lần học điểm cao hơn)</Badge>}
          {c.note === "excluded" && <Badge tone="neutral">Không tính GPA</Badge>}
          {c.average !== null && c.status !== "studying" && <span className="md-title-small text-on-surface">{fmt(c.average)}</span>}
          <Badge tone={s.tone}>{s.label}</Badge>
        </div>
      </div>
      {latest && <Advice c={c} />}
      {latest && !c.syllabusKnown && c.status !== "passed" && <p className="md-body-small text-on-surface-variant">Chưa có syllabus của môn này nên tạm dùng ngưỡng qua môn {fmt(c.advice.minPass)}.</p>}
      {practise && (
        <Link to={`/account/exams?tab=subject&subject=${encodeURIComponent(c.subjectCode)}`} className={buttonClass({ variant: "primary", size: "sm" })}>
          Luyện đề {c.subjectCode}
        </Link>
      )}
    </div>
  );
}

function TermSection({ term, open, laterOf }: { term: GradeTerm; open: boolean; laterOf: (c: GradeCourse) => boolean }) {
  return (
    <details open={open} className="overflow-hidden rounded-m3-lg border border-outline-variant bg-surface-container-lowest">
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-5 py-4">
        <span className="md-title-medium text-on-surface">{term.termName}</span>
        <span className="flex flex-wrap items-center gap-2">
          <span className="md-body-small text-on-surface-variant">{term.courses.length} môn</span>
          {term.gpa !== null ? (
            <>
              <span className="md-title-small text-on-surface">TB kỳ {fmt(term.gpa)}</span>
              {term.tier && <Badge tone="info">{TIER_LABEL[term.tier]}</Badge>}
            </>
          ) : (
            <Badge tone="neutral">Chưa có điểm TB kỳ</Badge>
          )}
        </span>
      </summary>
      <div>
        {term.courses.map((c) => (
          <CourseRow key={c.courseId} c={c} latest={!laterOf(c)} />
        ))}
      </div>
    </details>
  );
}

function Summary({ data }: { data: GradeOverview }) {
  const { cumulative: cum, tiers, currentTerm: cur } = data;
  if (!cur) return null;
  return (
    <Card>
      <CardHeader title={`Danh hiệu kỳ ${cur.termName}`} description="Xét theo điểm trung bình từng kỳ (thang 10, trọng số theo tín chỉ). Môn trượt tính 0 điểm nhưng vẫn cộng tín chỉ nên kéo điểm kỳ xuống." />
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <p className="md-label-medium text-on-surface-variant">Điểm trung bình kỳ</p>
            <p className="md-display-small text-primary">{cur.gpa === null ? "–" : fmt(cur.gpa)}</p>
          </div>
          <p className="md-body-small text-on-surface-variant">
            {cur.credits} tín chỉ đã có điểm{cur.studyingCredits > 0 ? ` · ${cur.studyingCredits} tín chỉ đang học` : ""}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="md-label-medium text-on-surface-variant">
                <th className="py-2 pr-4 font-medium">Danh hiệu</th>
                <th className="py-2 pr-4 font-medium">Điểm TB kỳ từ</th>
                <th className="py-2 font-medium">Của bạn</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((t) => (
                <tr key={t.key} className="border-t border-outline-variant">
                  <td className="py-2 pr-4 text-on-surface">Sinh viên {t.label}</td>
                  <td className="py-2 pr-4 text-on-surface">{fmt(t.min)}</td>
                  <td className="py-2 text-on-surface-variant">
                    {t.reached ? (
                      <Badge tone="success">Đã đạt</Badge>
                    ) : t.blocked ? (
                      t.blocked
                    ) : t.needAverage === null ? (
                      "Chưa đạt"
                    ) : t.needAverage > 10 ? (
                      "Không thể đạt trong kỳ này"
                    ) : (
                      <>
                        Cần trung bình ≥ <strong className="text-on-surface">{fmt(t.needAverage)}</strong> ở {cur.studyingCredits} tín chỉ đang học
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-m3-md bg-surface-container px-4 py-3">
          <p className="md-label-medium text-on-surface-variant">GPA tích lũy (dùng khi xét tốt nghiệp, không dùng xét danh hiệu kỳ; học cải thiện lấy điểm cao nhất)</p>
          <p className="md-title-medium text-on-surface">
            {cum.gpa === null ? "–" : fmt(cum.gpa)} <span className="md-body-small text-on-surface-variant">· {cum.credits} tín chỉ đã tính</span>
          </p>
        </div>
        <p className="md-body-small text-on-surface-variant">
          Danh hiệu học kỳ cần đủ 4 điều kiện: (1) điểm TB kỳ từ 9 trở lên là Xuất sắc, từ 8 trở lên là Giỏi; (2) qua 100% các môn trong kỳ; (3) đủ số tín chỉ tối thiểu của kỳ (thường từ 12); (4) không bị kỷ luật (FePass không biết điều này, bạn tự đối chiếu). FPT không dùng điểm rèn luyện. Môn học lại hoặc cải thiện: điểm kỳ cũ giữ nguyên, GPA tích lũy lấy điểm cao nhất trong các lần đã qua. Hạng tốt nghiệp xuất sắc và giỏi còn có thể bị hạ một mức nếu học lại quá 5% số tín chỉ hoặc bị kỷ luật cấp trường. Môn chưa có trong syllabus được coi là 0 tín chỉ nên chưa tính vào điểm; tiếng Anh chuẩn bị, Vovinam, thể chất, OJT cũng không tính.
        </p>
      </div>
    </Card>
  );
}

function Body({ data, reload }: { data: GradeOverview; reload: () => void }) {
  // Môn có lần học sau thì lần học này không cần gợi ý nữa
  const laterOf = (c: GradeCourse) => data.courses.some((o) => o.subjectCode === c.subjectCode && termRank(o.termName) > termRank(c.termName));
  return (
    <div className="space-y-6">
      <GradeSyncCard overview={data} onChange={reload} />
      {data.enabled &&
        (data.terms.length === 0 ? (
          <Card>
            <div className="p-5">
              <Empty title="Chưa có điểm nào">Mở Báo cáo điểm trên FAP (đã cài tiện ích) để đồng bộ.</Empty>
            </div>
          </Card>
        ) : (
          <>
            <Summary data={data} />
            <div className="space-y-3">
              <h2 className="md-title-medium text-on-surface">Theo học kỳ</h2>
              {data.terms.map((t, i) => (
                <TermSection key={t.termName} term={t} open={i === 0} laterOf={laterOf} />
              ))}
              {data.syncedAt && <p className="md-body-small text-on-surface-variant">Đồng bộ lần cuối: {new Date(data.syncedAt).toLocaleString("vi-VN")}</p>}
            </div>
          </>
        ))}
    </div>
  );
}

export default function GradesPage() {
  const query = useApi(() => gradeApi.overview(), []);
  return (
    <div>
      <PageHeader title="Điểm FAP" eyebrow="Cá nhân hoá" description="Điểm trung bình từng kỳ, danh hiệu Giỏi/Xuất sắc và điểm cần đạt ở bài thi cuối kỳ để qua từng môn." />
      <QueryBoundary query={query}>{(data) => <Body data={data} reload={query.reload} />}</QueryBoundary>
    </div>
  );
}

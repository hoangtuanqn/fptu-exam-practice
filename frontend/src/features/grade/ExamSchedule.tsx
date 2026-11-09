import { Badge, type Tone } from "@/shared/ui/Badge";
import { Card, CardHeader } from "@/shared/ui/Card";
import type { ExamSlot } from "./grade.api";

const KIND: Record<string, { label: string; tone: Tone }> = {
  FE: { label: "Thi cuối kỳ (FE)", tone: "info" },
  PE: { label: "Thi thực hành (PE)", tone: "info" },
  "2NDFE": { label: "Thi lần 2", tone: "neutral" },
};
const kindOf = (k: string) => KIND[k] ?? { label: k, tone: "neutral" as Tone };

const FORMAT: Record<string, string> = { practical_exam: "thực hành", multiple_choices: "trắc nghiệm" };
const formatOf = (f: string) => FORMAT[f.toLowerCase()] ?? f.replace(/_/g, " ").toLowerCase();

const pad = (n: number) => String(n).padStart(2, "0");
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const toDate = (iso: string) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const WEEKDAY = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

function daysLeft(iso: string) {
  return Math.round((toDate(iso).getTime() - toDate(todayIso()).getTime()) / 86_400_000);
}
export const leftText = (iso: string) => {
  const n = daysLeft(iso);
  return n <= 0 ? "hôm nay" : n === 1 ? "ngày mai" : `còn ${n} ngày`;
};

interface Group {
  key: string;
  date: string;
  subjectCode: string;
  subjectName: string;
  kind: string;
  resultDate: string | null;
  slots: ExamSlot[];
}

// Các buổi cùng ngày, cùng môn, cùng loại gộp một dòng (ví dụ FE có phần thực hành và phần trắc nghiệm)
function group(exams: ExamSlot[]): Group[] {
  const map = new Map<string, Group>();
  for (const e of exams) {
    const key = `${e.date}|${e.subjectCode}|${e.kind}`;
    const g = map.get(key) ?? { key, date: e.date, subjectCode: e.subjectCode, subjectName: e.subjectName, kind: e.kind, resultDate: e.resultDate, slots: [] };
    g.slots.push(e);
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date) || a.slots[0]!.start.localeCompare(b.slots[0]!.start));
}

const upcoming = (exams: ExamSlot[]) => group(exams.filter((e) => e.date >= todayIso()));

/** Các buổi thi sắp tới của một môn, mỗi dòng một ngày. Lượt thi lần 2 chỉ hiện khi includeSecond (môn đang phải thi lại). */
export function examLinesFor(exams: ExamSlot[], code: string, includeSecond: boolean): string[] {
  return upcoming(exams.filter((e) => e.subjectCode === code && (includeSecond || e.kind !== "2NDFE"))).map((g) => `${kindOf(g.kind).label}: ${dayMonth(g.date)} lúc ${g.slots[0]!.start}, ${leftText(g.date)}`);
}

function Row({ g }: { g: Group }) {
  const k = kindOf(g.kind);
  const d = toDate(g.date);
  const second = g.kind === "2NDFE";
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 border-t border-outline-variant px-5 py-3 first:border-t-0 ${second ? "opacity-80" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="w-16 shrink-0 rounded-m3-md bg-surface-container px-2 py-1 text-center">
          <p className="md-label-small text-on-surface-variant">{WEEKDAY[d.getDay()]}</p>
          <p className="md-title-small text-on-surface">{dayMonth(g.date)}</p>
        </div>
        <div>
          <p className="md-title-small text-on-surface">
            {g.subjectCode} <span className="md-body-medium text-on-surface-variant">· {g.subjectName}</span>
          </p>
          <p className="md-body-small text-on-surface-variant">
            {g.slots.map((s) => `${s.start}–${s.end} (${formatOf(s.format)})`).join(" · ")}
            {g.slots[0]!.room ? ` · phòng ${g.slots[0]!.room}` : second ? " · chưa xếp phòng" : ""}
          </p>
          {g.resultDate && <p className="md-body-small text-on-surface-variant">Công bố điểm: {dayMonth(g.resultDate)}</p>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge tone={k.tone}>{k.label}</Badge>
        <span className="md-label-medium text-primary">{leftText(g.date)}</span>
      </div>
    </div>
  );
}

// Lịch thi lấy từ trang Lịch thi trên FAP (đồng bộ cùng điểm)
export function ExamSchedule({ exams }: { exams: ExamSlot[] }) {
  const list = upcoming(exams);
  if (list.length === 0) return null;
  const hasSecond = list.some((g) => g.kind === "2NDFE");
  return (
    <Card>
      <CardHeader title="Lịch thi sắp tới" description="Lấy từ trang Lịch thi trên FAP" />
      <div>
        {list.map((g) => (
          <Row key={g.key} g={g} />
        ))}
      </div>
      {hasSecond && (
        <p className="md-body-small border-t border-outline-variant px-5 py-3 text-on-surface-variant">
          “Thi lần 2” là lượt thi dự phòng dùng cho thi lại hoặc thi cải thiện. FAP xếp sẵn cho các môn nên không có nghĩa là bạn đã trượt.
        </p>
      )}
    </Card>
  );
}

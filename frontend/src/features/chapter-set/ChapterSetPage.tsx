import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Layers, Play } from "lucide-react";
import { LinkImport } from "@/features/exam-import/components/LinkImport";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import type { ImportedExam } from "@/features/exam-import/types";
import { Button } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui/Card";
import { Segmented } from "@/shared/ui/Segmented";
import { AllSubjectsPicker } from "@/features/subject/AllSubjectsPicker";
import { SubjectCard } from "@/features/subject/SubjectCard";
import { ChapterWaitBanner, type ChapterWaitStage } from "./ChapterWaitBanner";
import type { SubjectItem } from "@/features/subject/subject.api";

const POLL_MS = 4000;
const LABEL_POLL_MAX = 45; // gắn chương xong sau khi có đáp án (thường vài chục giây): chờ tối đa chừng này lần (khoảng 3 phút)
const SOLVE_MAX_MS = 15 * 60 * 1000; // AI phân tích đáp án có thể mất vài phút: chờ tối đa 15 phút

type Mode = "practice" | "exam";

// Bộ đề theo chương: chọn môn, lấy một đề FE của đúng môn đó (kiểm tra trước khi trừ phí), rồi chỉ luyện các câu thuộc chương mình chọn.
export default function ChapterSetPage() {
  const [subject, setSubject] = useState<SubjectItem | null>(null);
  const [exam, setExam] = useState<ImportedExam | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Học tập" title="Bộ đề theo chương" description="Chọn môn và đề FE, rồi chỉ luyện các câu thuộc chương bạn đang muốn ôn." />
      {!subject ? (
        <AllSubjectsPicker title="Bước 1: chọn môn" onPick={setSubject} />
      ) : !exam ? (
        <SubjectCard title={`Bước 2: lấy đề môn ${subject.code}`} onBack={() => setSubject(null)}>
          <div className="space-y-4 p-5">
            <p className="md-body-medium text-on-surface-variant">
              <b className="text-on-surface">{subject.code}</b> · {subject.name}. Dán link bài trên FuOverflow: phải là bài có nhãn “Đề Thi FE” và thuộc đúng môn này. Hệ thống kiểm tra trước, đạt mới hỏi xác nhận phí.
            </p>
            <LinkImport subject={subject.code} onImported={setExam} />
          </div>
        </SubjectCard>
      ) : (
        <ChapterStep key={exam.id} subject={subject} exam={exam} onBack={() => setExam(null)} />
      )}
    </div>
  );
}

function ChapterStep({ subject, exam, onBack }: { subject: SubjectItem; exam: ImportedExam; onBack: () => void }) {
  const navigate = useNavigate();
  const [topicOf, setTopicOf] = useState<Map<number, string | null>>(() => new Map(exam.questions.filter((q) => !q.isReference).map((q) => [q.number, q.topic ?? null])));
  const [waiting, setWaiting] = useState(![...topicOf.values()].some(Boolean));
  const [stage, setStage] = useState<ChapterWaitStage>(exam.answerStatus === "PENDING" ? "solving" : "labeling");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("practice");

  // Đề mới lấy: AI phân tích đáp án trước (bước 1), rồi mới gắn chương cho từng câu (bước 2). Hỏi lại định kỳ cho tới khi có chương.
  useEffect(() => {
    if (!waiting) return;
    let alive = true;
    let labelTries = 0;
    const startedAt = Date.now();
    const tick = async () => {
      try {
        const r = await examImportApi.answers(exam.id);
        if (!alive) return;
        if (r.answers.some((a) => a.topic)) {
          setTopicOf(new Map(r.answers.map((a) => [a.number, a.topic ?? null])));
          setWaiting(false);
          return;
        }
        if (r.status === "FAILED") return void setWaiting(false);
        if (r.status === "PENDING") {
          setStage("solving"); // chưa có đáp án thì chưa gắn chương được: không tính vào số lần chờ gắn chương
          if (Date.now() - startedAt > SOLVE_MAX_MS) setWaiting(false);
          return;
        }
        setStage("labeling");
      } catch {
        /* lần sau hỏi lại */
      }
      labelTries++;
      if (alive && labelTries >= LABEL_POLL_MAX) setWaiting(false);
    };
    void tick();
    const id = setInterval(() => void tick(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [waiting, exam.id]);

  const chapters = useMemo(() => {
    const count = new Map<string, number>();
    for (const t of topicOf.values()) if (t) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => a[0].localeCompare(b[0], "vi", { numeric: true }));
  }, [topicOf]);
  const total = [...topicOf.values()].length;
  const unlabeled = total - chapters.reduce((n, [, c]) => n + c, 0);
  const selectedCount = chapters.filter(([t]) => picked.has(t)).reduce((n, [, c]) => n + c, 0);

  const toggle = (t: string) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (!next.delete(t)) next.add(t);
      return next;
    });

  const start = () => {
    const qs = new URLSearchParams({ mode });
    for (const [t] of chapters) if (picked.has(t)) qs.append("t", t);
    navigate(`/exam/${exam.threadId}?${qs.toString()}`);
  };

  return (
    <SubjectCard title="Bước 3: chọn chương muốn ôn" backLabel="Lấy đề khác" onBack={onBack}>
      <div className="space-y-4 p-5">
        <p className="md-body-medium text-on-surface-variant">
          <b className="text-on-surface">{exam.title}</b> · {subject.code} · {total} câu
        </p>

        {waiting ? (
          <ChapterWaitBanner stage={stage} />
        ) : chapters.length === 0 ? (
          <div className="space-y-3 rounded-m3-md bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
            <p>Đề này chưa có câu nào được gắn chương (có thể môn chưa có syllabus, hoặc AI chưa gắn được). Bạn vẫn làm được cả đề bình thường.</p>
            <Button variant="primary" onClick={() => navigate(`/exam/${exam.threadId}?mode=${mode}`)}>
              <Play size={16} /> Làm cả đề
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="md-label-large text-on-surface-variant">Tích chọn một hoặc nhiều chương</p>
              <div className="flex gap-1">
                <Button size="sm" variant="text" onClick={() => setPicked(new Set(chapters.map(([t]) => t)))}>
                  Chọn tất cả
                </Button>
                <Button size="sm" variant="text" onClick={() => setPicked(new Set())} disabled={picked.size === 0}>
                  Bỏ chọn
                </Button>
              </div>
            </div>
            <ul className="divide-y divide-outline-variant overflow-hidden rounded-m3-md border border-outline-variant">
              {chapters.map(([t, c]) => {
                const on = picked.has(t);
                return (
                  <li key={t}>
                    <label className={`md-state flex cursor-pointer items-center gap-3 px-4 py-3 ${on ? "bg-primary-container/40" : ""}`}>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${on ? "border-primary bg-primary text-on-primary" : "border-outline"}`}>
                        {on && <Check size={14} strokeWidth={3} />}
                      </span>
                      <input type="checkbox" checked={on} onChange={() => toggle(t)} className="sr-only" />
                      <span className="md-body-medium min-w-0 flex-1 text-on-surface">{t}</span>
                      <span className="md-label-medium shrink-0 tabular-nums text-on-surface-variant">{c} câu</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {unlabeled > 0 && <p className="md-body-small text-on-surface-variant">{unlabeled} câu chưa xếp được vào chương nào nên không nằm trong bộ đề theo chương.</p>}

            <div className="flex flex-col gap-3 border-t border-outline-variant pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Segmented
                label="Chế độ làm bài"
                value={mode}
                options={[
                  { value: "practice", label: "Luyện tập" },
                  { value: "exam", label: "Thi thử" },
                ]}
                onChange={(v) => setMode(v as Mode)}
              />
              <Button variant="primary" onClick={start} disabled={selectedCount === 0}>
                <Layers size={16} /> Bắt đầu với {selectedCount} câu
              </Button>
            </div>
          </>
        )}
      </div>
    </SubjectCard>
  );
}

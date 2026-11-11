import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CircleAlert, Layers, Loader2, Play } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Segmented } from "@/shared/ui/Segmented";
import { SubjectCard } from "@/features/subject/SubjectCard";
import type { SubjectItem } from "@/features/subject/subject.api";
import { ChapterWaitBanner } from "./ChapterWaitBanner";
import type { PickedExam } from "./types";
import { useChapterTopics } from "./useChapterTopics";

type Mode = "practice" | "exam";

// Bước 3: chương của tất cả đề đã chọn gộp lại. Tích chương một lần, hệ thống làm lần lượt từng đề (chỉ các câu thuộc chương đã chọn).
export function ChapterStep({ subject, exams, onBack }: { subject: SubjectItem; exams: PickedExam[]; onBack: () => void }) {
  const navigate = useNavigate();
  const { stateOf, waiting, stage, chapters, countIn } = useChapterTopics(exams);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>("practice");

  const toggle = (t: string) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (!next.delete(t)) next.add(t);
      return next;
    });

  // Đề nào có câu thuộc chương đã chọn thì vào hàng đợi, theo thứ tự đã chọn
  const queue = exams.filter((e) => countIn(e.id, picked) > 0);
  const selectedCount = queue.reduce((n, e) => n + countIn(e.id, picked), 0);
  const noChapter = exams.filter((e) => {
    const s = stateOf(e.id);
    return s && (s.status === "ready" || s.status === "error") && ![...s.topicOf.values()].some(Boolean);
  });

  // Mở đề đầu tiên; các đề còn lại đi theo ?next= (trang làm bài hiện nút "Đề tiếp theo" sau khi nộp)
  const go = (list: PickedExam[], withChapters: boolean) => {
    const first = list[0];
    if (!first) return;
    const qs = new URLSearchParams({ mode });
    if (withChapters) for (const [t] of chapters) if (picked.has(t)) qs.append("t", t);
    if (list.length > 1) qs.set("next", list.slice(1).map((e) => e.threadId).join(","));
    navigate(`/exam/${first.threadId}?${qs.toString()}`);
  };

  const totalQuestions = exams.reduce((n, e) => n + (e.totalQuestions || 0), 0);

  return (
    <SubjectCard title="Bước 3: chọn chương muốn ôn" backLabel="Chọn lại đề" onBack={onBack}>
      <div className="space-y-4 p-5">
        <p className="md-body-medium text-on-surface-variant">
          <b className="text-on-surface">{exams.length} đề</b> · {subject.code} · {totalQuestions} câu
        </p>

        <ul className="divide-y divide-outline-variant overflow-hidden rounded-m3-md border border-outline-variant">
          {exams.map((e) => {
            const s = stateOf(e.id);
            const busy = !s || s.status === "loading" || s.status === "waiting";
            const none = noChapter.some((x) => x.id === e.id);
            return (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="md-body-medium min-w-0 flex-1 truncate text-on-surface">{e.title}</span>
                {busy ? (
                  <span className="md-label-medium inline-flex shrink-0 items-center gap-1 text-primary">
                    <Loader2 size={13} className="animate-spin" /> Đang chuẩn bị
                  </span>
                ) : none ? (
                  <span className="md-label-medium inline-flex shrink-0 items-center gap-1 text-warning">
                    <CircleAlert size={13} /> Chưa có chương
                  </span>
                ) : (
                  <span className="md-label-medium shrink-0 tabular-nums text-on-surface-variant">{e.totalQuestions} câu</span>
                )}
              </li>
            );
          })}
        </ul>

        {waiting ? (
          <ChapterWaitBanner stage={stage} />
        ) : chapters.length === 0 ? (
          <div className="space-y-3 rounded-m3-md bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
            <p>Các đề này chưa có câu nào được gắn chương (có thể môn chưa có syllabus, hoặc AI chưa gắn được). Bạn vẫn làm được cả đề bình thường.</p>
            <Button variant="primary" onClick={() => go(exams, false)}>
              <Play size={16} /> Làm cả {exams.length > 1 ? `${exams.length} đề lần lượt` : "đề"}
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
            {noChapter.length > 0 && (
              <p className="md-body-small text-on-surface-variant">
                {noChapter.length} đề chưa có chương nên không nằm trong bộ đề theo chương: {noChapter.map((e) => e.title).join(", ")}.
              </p>
            )}

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
              <Button variant="primary" onClick={() => go(queue, true)} disabled={selectedCount === 0}>
                <Layers size={16} /> Bắt đầu với {selectedCount} câu{queue.length > 1 ? ` (${queue.length} đề lần lượt)` : ""}
              </Button>
            </div>
            {queue.length > 1 && <p className="md-body-small text-on-surface-variant">Làm xong đề nào thì bấm “Đề tiếp theo” ở bảng điểm. Mỗi đề có điểm riêng và được lưu vào lịch sử như thường.</p>}
          </>
        )}
      </div>
    </SubjectCard>
  );
}

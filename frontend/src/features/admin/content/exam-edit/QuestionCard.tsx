import { useMemo } from "react";
import { Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import type { ExamQuestionAdmin, QuestionResolve } from "@/features/admin/api/admin.api";
import { Badge } from "@/shared/ui/Badge";
import { ProtectedImg } from "@/shared/ui/ProtectedImg";
import { lettersOf } from "./answers";

export function QuestionCard({ q, answer, isReference, dirty, disabled, solving, aiNote, onSolve, onToggle, onClear, onReference, onReset, onZoom }: {
  q: ExamQuestionAdmin;
  answer: string;
  isReference: boolean;
  dirty: boolean;
  disabled: boolean;
  solving: boolean; // đang nhờ AI giải lại câu này
  aiNote?: QuestionResolve; // gợi ý gần nhất của AI cho câu này
  onSolve: () => void;
  onToggle: (letter: string) => void;
  onClear: () => void;
  onReference: (v: boolean) => void;
  onReset: () => void;
  onZoom: () => void;
}) {
  const picked = lettersOf(answer);
  const options = useMemo(() => {
    const max = Math.max("F".charCodeAt(0), ...picked.map((l) => l.charCodeAt(0)));
    return Array.from({ length: max - 64 }, (_, i) => String.fromCharCode(65 + i));
  }, [picked]);
  const missing = !isReference && picked.length === 0;

  return (
    <div id={`q-${q.number}`} className={`overflow-hidden rounded-2xl border bg-surface-container-lowest shadow-soft transition ${dirty ? "border-amber-300 ring-2 ring-amber-100" : missing ? "border-rose-200" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-serif text-lg font-semibold text-slate-900">Câu {q.number}</span>
          {isReference && <Badge tone="warning">Tài liệu tham khảo</Badge>}
          {dirty && <Badge tone="info">Đã sửa</Badge>}
          {missing && !dirty && <Badge tone="danger">Chưa có đáp án</Badge>}
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <button onClick={onReset} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
              <RotateCcw size={12} /> Hoàn tác
            </button>
          )}
          <button
            type="button"
            onClick={onSolve}
            disabled={disabled || solving}
            title="Nhờ AI giải lại câu này (chỉ gợi ý, bấm Lưu mới ghi)"
            className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 transition hover:border-brand-400 disabled:opacity-50"
          >
            {solving ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {solving ? "AI đang giải…" : "Giải lại câu này"}
          </button>
        </div>
      </div>

      <button type="button" onClick={onZoom} className="block w-full bg-slate-50 p-2" title="Bấm để xem ảnh lớn">
        <ProtectedImg src={q.imageUrl} alt={`Câu ${q.number}`} loading="lazy" className="mx-auto max-h-[460px] w-auto max-w-full rounded-lg object-contain" />
      </button>

      <div className="space-y-3 px-4 py-3">
        {!isReference && (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {options.map((l) => {
                const on = picked.includes(l);
                return (
                  <button
                    key={l}
                    type="button"
                    disabled={disabled}
                    aria-pressed={on}
                    onClick={() => onToggle(l)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold transition active:scale-95 disabled:opacity-40 ${
                      on ? "border-brand-600 bg-primary-container text-on-primary-container shadow-md shadow-brand-500/30" : "border-slate-200 bg-surface-container-lowest text-slate-600 hover:border-brand-300 hover:bg-brand-50"
                    }`}
                  >
                    {l}
                  </button>
                );
              })}
              {picked.length > 0 && (
                <button type="button" disabled={disabled} onClick={onClear} className="ml-1 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600">
                  <X size={12} /> Xoá
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">Bấm nhiều chữ cho câu có nhiều đáp án đúng.</p>
          </div>
        )}
        {aiNote && (
          <details className="rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs text-slate-600">
            <summary className="cursor-pointer font-medium text-brand-900">
              {aiNote.notQuestion ? "AI cho rằng đây không phải câu hỏi" : aiNote.answer ? `AI gợi ý: ${aiNote.answer} (đã điền vào bản nháp, chưa lưu)` : "AI chưa đưa ra được đáp án"}
            </summary>
            {aiNote.report && <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">{aiNote.report}</p>}
          </details>
        )}
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={isReference} disabled={disabled} onChange={(e) => onReference(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
          Đây là ảnh tài liệu tham khảo, không phải câu hỏi (không chấm điểm)
        </label>
      </div>
    </div>
  );
}

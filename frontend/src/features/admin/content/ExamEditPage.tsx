import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Check, ClipboardPaste, ExternalLink, Loader2, Pencil, RotateCcw, Save, Search, Sparkles, Trash2, X } from "lucide-react";
import { adminApi, type ExamAdminDetail, type ExamQuestionAdmin, type QuestionChange, type QuestionResolve } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import type { AnswerSource } from "@/shared/types/api";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { Segmented } from "@/shared/ui/Segmented";
import { errorMessage } from "@/shared/api/errors";
import { useConfirm } from "@/shared/ui/ConfirmDialog";

const SOURCE: Record<AnswerSource, [string, Tone]> = {
  PENDING: ["AI đang giải", "info"],
  FAILED: ["AI lỗi, chưa có đáp án", "danger"],
  DEFAULT: ["Chưa có đáp án", "danger"],
  AI: ["AI giải", "success"],
  MANUAL: ["Chỉnh tay", "info"],
};

type Filter = "all" | "empty" | "changed";
interface Draft {
  answer?: string;
  isReference?: boolean;
}

// "C A" / "ACD" / "a c" -> ["A","C"]
const lettersOf = (answer: string) => [...new Set(answer.toUpperCase().replace(/[^A-Z]/g, "").split(""))].sort();
const normalize = (answer: string) => lettersOf(answer).join(" ");

/**
 * Đọc đáp án dán vào. Mỗi token (ngăn bởi dấu cách, phẩy, xuống dòng) là đáp án của một câu:
 *   "1A 2B 3C"  /  "1. A  2: B C"  -> theo số câu
 *   "A B C D"                      -> lần lượt cho các câu chưa là tài liệu tham khảo
 */
function parsePasted(text: string, numbers: number[]): Map<number, string> {
  const result = new Map<number, string>();
  let seq = 0;
  for (const line of text.split(/[\n,;]+/)) {
    if (/\d/.test(line)) {
      // có số câu: "1A 2B", "3. A C", "4: B"
      for (const m of line.matchAll(/(\d+)\s*[.:)-]?\s*([A-Za-z]+(?:\s+[A-Za-z]+)*?)(?=\s*\d|\s*$)/g)) result.set(Number(m[1]), normalize(m[2]));
    } else {
      // không có số: mỗi từ là đáp án của câu kế tiếp
      for (const t of line.trim().split(/\s+/)) {
        if (!/^[A-Za-z]+$/.test(t)) continue;
        const n = numbers[seq++];
        if (n !== undefined) result.set(n, normalize(t));
      }
    }
  }
  return result;
}

function PasteDialog({ numbers, onApply, onClose }: { numbers: number[]; onApply: (m: Map<number, string>) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => parsePasted(text, numbers), [text, numbers]);
  return (
    <Modal onClose={onClose}>
      <ModalTitle icon={ClipboardPaste}>Dán đáp án hàng loạt</ModalTitle>
      <p className="mt-2 text-sm text-slate-500">
        Dán theo số câu (<code className="rounded bg-slate-100 px-1">1A 2B 3C</code> hoặc <code className="rounded bg-slate-100 px-1">1. A C</code>), hoặc chỉ dán chuỗi đáp án lần lượt (<code className="rounded bg-slate-100 px-1">A B C D</code>). Nhiều đáp án một câu: <code className="rounded bg-slate-100 px-1">AC</code>.
      </p>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={"1A 2C 3B 4AD\nhoặc\nA C B AD ..."}
        className="mt-3 w-full rounded-xl border border-slate-200 p-3 font-mono text-sm shadow-soft focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
      />
      <p className="mt-2 text-sm text-slate-600">{text.trim() ? `Nhận diện được ${parsed.size} câu.` : "Chưa dán gì."}</p>
      <ModalActions>
        <Button grow onClick={onClose}>
          Huỷ
        </Button>
        <Button grow variant="primary" disabled={parsed.size === 0} onClick={() => onApply(parsed)}>
          Áp dụng {parsed.size > 0 && `(${parsed.size} câu)`}
        </Button>
      </ModalActions>
    </Modal>
  );
}

// Tiêu đề đề thi, bấm bút chì để đổi tên
function TitleEditor({ examId, title, onSaved }: { examId: number; title: string; onSaved: () => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);

  async function save() {
    const next = value.trim();
    if (!next || next === title) return setEditing(false);
    setSaving(true);
    try {
      await adminApi.renameExam(examId, next);
      toast.success("Đã đổi tên đề");
      setEditing(false);
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err, "Không đổi được tên"));
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="group flex items-start gap-2">
        <h1 className="font-serif text-2xl font-semibold text-slate-900">{title}</h1>
        <button
          onClick={() => {
            setValue(title);
            setEditing(true);
          }}
          aria-label="Đổi tên đề"
          title="Đổi tên đề"
          className="mt-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <Pencil size={16} />
        </button>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        autoFocus
        value={value}
        maxLength={255}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        aria-label="Tiêu đề đề thi"
        className="min-w-64 flex-1 rounded-xl border border-slate-300 px-3 py-2 font-serif text-lg focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
      />
      <Button type="submit" variant="primary" size="sm" disabled={saving || !value.trim()}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Lưu
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
        Huỷ
      </Button>
    </form>
  );
}

// Xoá hẳn đề: nói rõ những gì sẽ mất theo để admin cân nhắc
function DeleteExamDialog({ exam, onClose }: { exam: ExamAdminDetail; onClose: () => void }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const u = exam.usage;
  const items = [
    [u.userExams, "thành viên đang có đề này trong kho"],
    [u.attempts, "bài làm đã nộp"],
    [u.unlocks, "gói mở khóa lời giải đã mua"],
    [u.purchases, "lời giải mua lẻ"],
  ].filter(([n]) => (n as number) > 0);

  async function remove() {
    setBusy(true);
    try {
      await adminApi.deleteExam(exam.id);
      toast.success("Đã xoá đề");
      navigate("/admin/exams", { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, "Không xoá được"));
      setBusy(false);
    }
  }

  return (
    <Modal onClose={busy ? undefined : onClose}>
      <ModalTitle icon={Trash2}>Xoá đề này?</ModalTitle>
      <p className="mt-3 text-sm font-medium text-slate-800">{exam.title}</p>
      {items.length > 0 ? (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <p className="font-medium">Các dữ liệu sau sẽ bị xoá theo và không khôi phục được:</p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
            {items.map(([n, label]) => (
              <li key={label as string}>
                <b>{n as number}</b> {label as string}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs">Credit đã trả không được hoàn tự động. Nếu cần, hãy cộng lại thủ công cho thành viên.</p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Chưa ai dùng đề này nên xoá không ảnh hưởng thành viên nào.</p>
      )}
      <p className="mt-3 text-xs text-slate-500">Xoá cả ảnh câu hỏi trên máy chủ. Sau đó có thể lấy lại đề này từ FuOverflow như đề mới.</p>
      <ModalActions>
        <Button grow onClick={onClose} disabled={busy}>
          Huỷ
        </Button>
        <Button grow variant="danger" onClick={() => void remove()} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Xoá đề
        </Button>
      </ModalActions>
    </Modal>
  );
}

function QuestionCard({ q, answer, isReference, dirty, disabled, solving, aiNote, onSolve, onToggle, onClear, onReference, onReset, onZoom }: {
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
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
        <div className="flex items-center gap-2">
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
            title="Lấy lại bình luận của câu này từ FuOverflow rồi nhờ AI giải lại (chỉ gợi ý, bấm Lưu mới ghi)"
            className="inline-flex items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 transition hover:border-brand-400 disabled:opacity-50"
          >
            {solving ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {solving ? "AI đang giải…" : "Giải lại câu này"}
          </button>
        </div>
      </div>

      <button type="button" onClick={onZoom} className="block w-full bg-slate-50 p-2" title="Bấm để xem ảnh lớn">
        <img src={q.imageUrl} alt={`Câu ${q.number}`} loading="lazy" className="mx-auto max-h-[460px] w-auto max-w-full rounded-lg object-contain" />
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
                <button type="button" disabled={disabled} onClick={onClear} className="ml-1 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600">
                  <X size={12} /> Xoá
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-400">Bấm nhiều chữ cho câu có nhiều đáp án đúng.</p>
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

export default function ExamEditPage() {
  const { id } = useParams();
  const examId = Number(id);
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const { data, error, loading, reload } = useApi(() => adminApi.examDetail(examId), [examId]);

  const [draft, setDraft] = useState<Record<number, Draft>>({});
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [jump, setJump] = useState("");
  const [pasting, setPasting] = useState(false);
  const [zoom, setZoom] = useState<ExamQuestionAdmin | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [solvingNo, setSolvingNo] = useState<number | null>(null); // câu đang nhờ AI giải (mỗi lần một câu để không dồn token)
  const [aiNotes, setAiNotes] = useState<Record<number, QuestionResolve>>({});

  const original = useMemo(() => new Map((data?.questions ?? []).map((q) => [q.number, q])), [data]);

  // Giá trị đang hiển thị = bản nháp nếu có, không thì dữ liệu đã lưu
  const view = (q: ExamQuestionAdmin) => ({
    answer: draft[q.number]?.answer ?? q.answer,
    isReference: draft[q.number]?.isReference ?? q.isReference,
  });
  const isDirty = (q: ExamQuestionAdmin) => {
    const v = view(q);
    return normalize(v.answer) !== normalize(q.answer) || v.isReference !== q.isReference;
  };

  const changes: QuestionChange[] = useMemo(
    () =>
      (data?.questions ?? []).flatMap((q) => {
        const d = draft[q.number];
        if (!d) return [];
        const c: QuestionChange = { number: q.number };
        if (d.answer !== undefined && normalize(d.answer) !== normalize(q.answer)) c.answer = normalize(d.answer);
        if (d.isReference !== undefined && d.isReference !== q.isReference) c.isReference = d.isReference;
        return c.answer !== undefined || c.isReference !== undefined ? [c] : [];
      }),
    [data, draft],
  );

  // Có thay đổi chưa lưu thì cảnh báo khi đóng/tải lại tab
  useEffect(() => {
    if (changes.length === 0) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changes.length]);

  const patch = (n: number, d: Draft) => setDraft((prev) => ({ ...prev, [n]: { ...prev[n], ...d } }));
  const reset = (n: number) =>
    setDraft((prev) => {
      const { [n]: _drop, ...rest } = prev;
      void _drop;
      return rest;
    });

  const toggle = (q: ExamQuestionAdmin, letter: string) => {
    const set = new Set(lettersOf(view(q).answer));
    if (set.has(letter)) set.delete(letter);
    else set.add(letter);
    patch(q.number, { answer: [...set].sort().join(" ") });
  };

  async function solveOne(q: ExamQuestionAdmin) {
    if (!(await confirm({ title: `Giải lại câu ${q.number} bằng AI?`, message: "App sẽ lấy lại bình luận của câu này từ FuOverflow rồi gọi AI giải một lần (tốn một lượt gọi AI). Kết quả chỉ là gợi ý điền vào bản nháp, bạn bấm Lưu mới ghi.", confirmLabel: "Giải lại" }))) return;
    setSolvingNo(q.number);
    try {
      const r = await adminApi.resolveQuestion(examId, q.number);
      setAiNotes((prev) => ({ ...prev, [q.number]: r }));
      if (r.notQuestion) toast.error(`Câu ${q.number}: AI cho rằng đây không phải câu hỏi`);
      else if (r.answer) {
        patch(q.number, { answer: normalize(r.answer) }); // chỉ điền vào bản nháp, admin duyệt rồi bấm Lưu
        toast.success(`Câu ${q.number}: AI gợi ý ${r.answer}${r.commentsRefreshed ? ` (đã lấy lại ${r.commentsCount ?? 0} bình luận)` : ""}`);
        if (r.commentsNote) toast.error(`Câu ${q.number}: ${r.commentsNote}`);
      } else toast.error(`Câu ${q.number}: AI chưa đưa ra được đáp án`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSolvingNo(null);
    }
  }

  async function save() {
    if (!(await confirm({ title: `Lưu ${changes.length} câu đã sửa?`, message: "Đáp án mới áp dụng ngay cho mọi người dùng. Lời giải thích AI cũ của các câu đổi đáp án sẽ bị xoá, và đề chuyển sang nguồn \"Chỉnh tay\".", confirmLabel: "Lưu" }))) return;
    setSaving(true);
    try {
      await adminApi.saveExamQuestions(examId, changes);
      toast.success(`Đã lưu ${changes.length} câu`);
      setDraft({});
      reload();
    } catch (err) {
      toast.error(errorMessage(err, "Không lưu được"));
    } finally {
      setSaving(false);
    }
  }

  function applyPasted(map: Map<number, string>) {
    let applied = 0;
    setDraft((prev) => {
      const next = { ...prev };
      for (const [n, answer] of map) {
        if (!original.has(n)) continue;
        next[n] = { ...next[n], answer };
        applied++;
      }
      return next;
    });
    setPasting(false);
    toast.success(`Đã điền ${map.size} câu, kiểm tra rồi bấm Lưu`);
    void applied;
  }

  function goTo() {
    const n = Number(jump);
    if (!original.has(n)) return toast.error(`Đề không có câu ${n || ""}`);
    document.getElementById(`q-${n}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (!Number.isInteger(examId)) return <ErrorBox message="Đề không hợp lệ" />;
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Không tải được đề"} onRetry={reload} />;

  const locked = data.solving;
  const questions = data.questions.filter((q) => {
    if (filter === "changed") return isDirty(q);
    if (filter === "empty") return !view(q).isReference && lettersOf(view(q).answer).length === 0;
    return true;
  });
  const gradable = data.questions.filter((q) => !view(q).isReference);
  const answered = gradable.filter((q) => lettersOf(view(q).answer).length > 0).length;

  return (
    <>
      {confirmDialog}
      <div className="mb-4">
        <Link to="/admin/exams" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft size={15} /> Danh sách đề
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <TitleEditor key={data.title} examId={data.id} title={data.title} onSaved={reload} />
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <Badge tone={SOURCE[data.answerSource][1]}>{SOURCE[data.answerSource][0]}</Badge>
              <span>Thread {data.threadId}</span>
              <span>· {data.questions.length} ảnh</span>
              <span>
                · có đáp án {answered}/{gradable.length}
              </span>
              <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                <ExternalLink size={13} /> Xem đề này trên FuOverflow
              </a>
              <Link to={`/exam/${data.threadId}`} className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                <BookOpen size={13} /> Mở làm thử
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3 flex justify-end">
        <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" disabled={locked} onClick={() => setDeleting(true)}>
          <Trash2 size={14} /> Xoá đề
        </Button>
      </div>

      {locked && <div className="mb-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-800">AI đang giải đề này, chờ AI xong rồi mới sửa tay được.</div>}

      {/* Thanh công cụ dính khi cuộn */}
      <div className="sticky top-16 z-20 -mx-1 mb-4 rounded-2xl border border-slate-200 bg-surface-container-lowest/90 p-3 shadow-soft backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Lọc câu hỏi"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Tất cả" },
              { value: "empty", label: "Chưa có đáp án" },
              { value: "changed", label: `Đã sửa${changes.length ? ` (${changes.length})` : ""}` },
            ]}
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goTo();
            }}
            className="flex items-center gap-1"
          >
            <input
              inputMode="numeric"
              value={jump}
              onChange={(e) => setJump(e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder="Câu số…"
              aria-label="Nhảy tới câu"
              className="w-24 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
            />
            <Button size="sm" type="submit" aria-label="Đi tới câu" title="Đi tới câu">
              <Search size={14} />
            </Button>
          </form>
          <Button size="sm" disabled={locked} onClick={() => setPasting(true)}>
            <ClipboardPaste size={14} /> Dán đáp án
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {changes.length > 0 && (
              <Button size="sm" variant="ghost" disabled={saving} onClick={() => setDraft({})}>
                Bỏ thay đổi
              </Button>
            )}
            <Button variant="primary" disabled={saving || changes.length === 0 || locked} onClick={() => void save()}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : changes.length ? <Save size={15} /> : <Check size={15} />}
              {changes.length ? `Lưu ${changes.length} thay đổi` : "Đã lưu"}
            </Button>
          </div>
        </div>
        {changes.length > 0 && data.answerSource !== "MANUAL" && <p className="mt-2 text-xs text-slate-500">Sau khi lưu, nguồn đáp án của đề chuyển thành “Chỉnh tay”. Lời giải AI của các câu đổi đáp án sẽ được xoá để AI viết lại theo đáp án mới.</p>}
      </div>

      {questions.length === 0 ? (
        <Card>
          <p className="p-8 text-center text-sm text-slate-500">Không có câu nào khớp bộ lọc.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {questions.map((q) => {
            const v = view(q);
            return (
              <QuestionCard
                key={q.number}
                q={q}
                answer={v.answer}
                isReference={v.isReference}
                dirty={isDirty(q)}
                disabled={locked}
                solving={solvingNo === q.number}
                aiNote={aiNotes[q.number]}
                onSolve={() => void solveOne(q)}
                onToggle={(l) => toggle(q, l)}
                onClear={() => patch(q.number, { answer: "" })}
                onReference={(r) => patch(q.number, { isReference: r })}
                onReset={() => reset(q.number)}
                onZoom={() => setZoom(q)}
              />
            );
          })}
        </div>
      )}

      {deleting && <DeleteExamDialog exam={data} onClose={() => setDeleting(false)} />}
      {pasting && <PasteDialog numbers={gradable.map((q) => q.number)} onApply={applyPasted} onClose={() => setPasting(false)} />}
      {zoom && (
        <Modal onClose={() => setZoom(null)} wide>
          <div className="flex items-center justify-between">
            <ModalTitle icon={BookOpen}>Câu {zoom.number}</ModalTitle>
            <button onClick={() => setZoom(null)} aria-label="Đóng" title="Đóng" className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
          <img src={zoom.imageUrl} alt={`Câu ${zoom.number}`} className="mt-4 w-full rounded-lg" />
        </Modal>
      )}
    </>
  );
}

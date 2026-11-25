import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Check, ClipboardPaste, Loader2, Save, Search, X } from "lucide-react";
import { adminApi, type ExamQuestionAdmin, type QuestionChange, type QuestionResolve } from "@/features/admin/api/admin.api";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { ErrorBox } from "@/shared/ui/Feedback";
import { Modal, ModalTitle } from "@/shared/ui/Modal";
import { ProtectedImg } from "@/shared/ui/ProtectedImg";
import { Segmented } from "@/shared/ui/Segmented";
import { SkeletonBlock } from "@/shared/ui/Skeleton";
import { isUuid } from "@/shared/utils/uuid";
import { lettersOf, normalize } from "./exam-edit/answers";
import { DeleteExamDialog } from "./exam-edit/DeleteExamDialog";
import { ExamInfo } from "./exam-edit/ExamInfo";
import { MoreMenu } from "./exam-edit/MoreMenu";
import { PasteDialog } from "./exam-edit/PasteDialog";
import { QuestionCard } from "./exam-edit/QuestionCard";

type Filter = "all" | "empty" | "changed";
interface Draft {
  answer?: string;
  isReference?: boolean;
}

export default function ExamEditPage() {
  const { id } = useParams();
  const examId = id ?? "";
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
  const [downloading, setDownloading] = useState(false);
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
    if (!(await confirm({ title: `Giải lại câu ${q.number} bằng AI?`, message: "App sẽ gọi AI giải câu này một lần (tốn một lượt gọi AI). Kết quả chỉ là gợi ý điền vào bản nháp, bạn bấm Lưu mới ghi.", confirmLabel: "Giải lại" }))) return;
    setSolvingNo(q.number);
    try {
      const r = await adminApi.resolveQuestion(examId, q.number);
      setAiNotes((prev) => ({ ...prev, [q.number]: r }));
      if (r.notQuestion) toast.error(`Câu ${q.number}: AI cho rằng đây không phải câu hỏi`);
      else if (r.answer) {
        patch(q.number, { answer: normalize(r.answer) }); // chỉ điền vào bản nháp, admin duyệt rồi bấm Lưu
        toast.success(`Câu ${q.number}: AI gợi ý ${r.answer}`);
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

  async function download() {
    setDownloading(true);
    try {
      await adminApi.downloadExam(examId);
      toast.success("Đã tải đề");
    } catch (err) {
      toast.error(errorMessage(err, "Không tải được đề"));
    } finally {
      setDownloading(false);
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

  if (!isUuid(examId)) return <ErrorBox message="Đề không hợp lệ" />;
  if (loading && !data)
    return (
      <>
        <Link to="/admin/exams" className="panel-back-link mb-4">
          <ArrowLeft size={15} /> Danh sách đề
        </Link>
        <SkeletonBlock lines={6} />
      </>
    );
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
      <Link to="/admin/exams" className="panel-back-link mb-2">
        <ArrowLeft size={15} /> Danh sách đề
      </Link>
      <ExamInfo exam={data} answered={answered} gradable={gradable.length} onSaved={reload} />

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
            <MoreMenu downloading={downloading} locked={locked} onDownload={() => void download()} onDelete={() => setDeleting(true)} />
          </div>
        </div>
        {changes.length > 0 && data.answerSource !== "MANUAL" && <p className="mt-2 text-xs text-slate-500">Sau khi lưu, nguồn đáp án của đề chuyển thành “Chỉnh tay”. Lời giải AI của các câu đổi đáp án sẽ được xoá để AI viết lại theo đáp án mới.</p>}
      </div>

      {questions.length === 0 ? (
        <Card>
          <p className="p-8 text-center text-sm text-slate-500">{data.questions.length === 0 ? "Đề này chưa có ảnh câu hỏi." : "Không có câu nào khớp bộ lọc."}</p>
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
            <button onClick={() => setZoom(null)} aria-label="Đóng" title="Đóng" className="panel-hit relative rounded-md p-1 text-slate-500 hover:bg-slate-100">
              <X size={18} />
            </button>
          </div>
          <ProtectedImg src={zoom.imageUrl} alt={`Câu ${zoom.number}`} className="mt-4 w-full rounded-lg" />
        </Modal>
      )}
    </>
  );
}

import type { Dispatch, SetStateAction } from "react";
import { ArrowRight, Check, Loader2, X } from "lucide-react";
import type { ImportedExam } from "@/features/exam-import/types";
import { examLibraryApi } from "@/features/exam-store/exam-library.api";
import { SubjectCard } from "@/features/subject/SubjectCard";
import type { SubjectItem } from "@/features/subject/subject.api";
import { useApi } from "@/shared/hooks/useApi";
import { Button } from "@/shared/ui/Button";
import { ErrorBox } from "@/shared/ui/Feedback";
import { MultiLinkImport } from "./MultiLinkImport";
import type { PickedExam } from "./types";

const MAX_PICK = 10; // chọn tối đa chừng này đề một lần để bước gom chương không quá nặng
const LIBRARY_LIMIT = 50; // số đề tối đa lấy về một lần từ kho của tôi (giới hạn của máy chủ)

interface Props {
  subject: SubjectItem;
  picked: PickedExam[];
  onChange: Dispatch<SetStateAction<PickedExam[]>>;
  onNext: () => void;
  onBack: () => void;
}

// Bước 2: chọn nhiều đề của môn từ kho cá nhân, và/hoặc thêm đề từ link FuOverflow (thêm được nhiều link, mỗi link một lần).
// Đề đã có trong kho thì mở lại miễn phí, không trừ credit (máy chủ báo giá trước khi lấy).
export function ExamPickStep({ subject, picked, onChange, onNext, onBack }: Props) {
  const library = useApi(() => examLibraryApi.list(1, LIBRARY_LIMIT, subject.code), [subject.code]);
  const ids = new Set(picked.map((p) => p.id));
  const full = picked.length >= MAX_PICK;

  const toggle = (e: PickedExam) => {
    if (ids.has(e.id)) return onChange((cur) => cur.filter((p) => p.id !== e.id));
    if (!full) onChange((cur) => (cur.length >= MAX_PICK ? cur : [...cur, e]));
  };

  // Nhiều đề lần lượt về từ các link: cập nhật theo giá trị mới nhất (dạng hàm) để không đề nào bị mất
  const added = (exam: ImportedExam) => {
    onChange((cur) => (cur.some((p) => p.id === exam.id) || cur.length >= MAX_PICK ? cur : [...cur, { id: exam.id, threadId: exam.threadId, title: exam.title, totalQuestions: exam.totalQuestions }]));
    library.reload();
  };

  const items = library.data?.items ?? [];
  const total = library.data?.meta.total ?? 0;

  // Chọn thêm các đề trong kho chưa được chọn, tối đa MAX_PICK đề
  const selectAll = () => {
    const extra = items.filter((i) => !ids.has(i.id)).map(({ id, threadId, title, totalQuestions }) => ({ id, threadId, title, totalQuestions }));
    onChange((cur) => [...cur, ...extra.filter((x) => !cur.some((p) => p.id === x.id))].slice(0, MAX_PICK));
  };

  return (
    <SubjectCard title={`Bước 2: chọn đề môn ${subject.code}`} onBack={onBack}>
      <div className="space-y-6 p-5">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="md-title-small text-on-surface">Đề trong kho của bạn</h3>
            {items.length > 0 && (
              <div className="flex gap-1">
                <Button size="sm" variant="text" onClick={selectAll}>
                  Chọn tất cả
                </Button>
                <Button size="sm" variant="text" onClick={() => onChange([])} disabled={picked.length === 0}>
                  Bỏ chọn
                </Button>
              </div>
            )}
          </div>

          {library.loading && !library.data ? (
            <p role="status" className="md-body-medium mt-3 flex items-center gap-2 text-on-surface-variant">
              <Loader2 size={16} className="animate-spin" /> Đang tải kho đề…
            </p>
          ) : library.error ? (
            <div className="mt-3">
              <ErrorBox message={library.error} onRetry={library.reload} />
            </div>
          ) : items.length === 0 ? (
            <p className="md-body-medium mt-2 rounded-m3-md bg-surface-container-low px-4 py-3 text-on-surface-variant">Kho của bạn chưa có đề nào của môn {subject.code}. Thêm đề bằng link FuOverflow ở bên dưới.</p>
          ) : (
            <>
              <ul className="mt-3 divide-y divide-outline-variant overflow-hidden rounded-m3-md border border-outline-variant">
                {items.map((e) => {
                  const on = ids.has(e.id);
                  const blocked = !on && full;
                  return (
                    <li key={e.id}>
                      <label className={`md-state flex items-center gap-3 px-4 py-3 ${blocked ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${on ? "bg-primary-container/40" : ""}`}>
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${on ? "border-primary bg-primary text-on-primary" : "border-outline"}`}>{on && <Check size={14} strokeWidth={3} />}</span>
                        <input type="checkbox" checked={on} disabled={blocked} onChange={() => toggle({ id: e.id, threadId: e.threadId, title: e.title, totalQuestions: e.totalQuestions })} className="sr-only" />
                        <span className="min-w-0 flex-1">
                          <span className="md-body-medium block truncate text-on-surface">{e.title}</span>
                          {(e.answerSource === "PENDING" || e.answerSource === "FAILED" || e.answerSource === "DEFAULT") && (
                            <span className="md-label-small text-warning">{e.answerSource === "PENDING" ? "Đang chuẩn bị đáp án" : "Chưa có đáp án"}</span>
                          )}
                        </span>
                        <span className="md-label-medium shrink-0 tabular-nums text-on-surface-variant">{e.totalQuestions} câu</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {total > items.length && <p className="md-body-small mt-2 text-on-surface-variant">Đang hiện {items.length} trên {total} đề của môn này (mới nhất trước). Đề cũ hơn hãy thêm bằng link.</p>}
            </>
          )}
        </section>

        <section className="border-t border-outline-variant pt-5">
          <h3 className="md-title-small text-on-surface">Thêm đề từ link FuOverflow</h3>
          <p className="md-body-medium mt-1 text-on-surface-variant">
            Dán một hoặc nhiều link bài có nhãn “Đề Thi FE” của môn <b className="text-on-surface">{subject.code}</b>. Link nào đã có trong kho của bạn thì mở lại miễn phí, không trừ credit.
          </p>
          <div className="mt-3">
            <MultiLinkImport subject={subject.code} slots={Math.max(0, MAX_PICK - picked.length)} pickedThreads={new Set(picked.map((p) => p.threadId))} onImported={added} />
          </div>
        </section>

        <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-col gap-3 border-t border-outline-variant bg-surface-container-lowest px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="md-label-large text-on-surface">Đã chọn {picked.length} đề{full ? ` (tối đa ${MAX_PICK})` : ""}</p>
            {picked.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {picked.map((p) => (
                  <li key={p.id} className="md-label-small inline-flex max-w-[16rem] items-center gap-1 rounded-full bg-secondary-container py-0.5 pl-2.5 pr-1 text-on-secondary-container">
                    <span className="truncate">{p.title}</span>
                    <button type="button" onClick={() => toggle(p)} aria-label={`Bỏ chọn ${p.title}`} className="rounded-full p-0.5 hover:bg-on-secondary-container/10">
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button variant="primary" onClick={onNext} disabled={picked.length === 0} className="shrink-0">
            Tiếp tục chọn chương <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </SubjectCard>
  );
}

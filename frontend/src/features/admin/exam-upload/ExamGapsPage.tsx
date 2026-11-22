import { useCallback, useRef, useState } from "react";
import { ExternalLink, FilePlus2, Pencil, Search, SearchCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { useUrlSearch } from "@/shared/hooks/useUrlSearch";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Feedback";
import { inputClass, Select } from "@/shared/ui/Input";
import { Modal, ModalTitle } from "@/shared/ui/Modal";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { fuoThreadUrl } from "@/shared/utils/fuo-link";
import { formatDate } from "@/shared/utils/formatters";
import { SubjectCombobox } from "@/features/subject/SubjectCombobox";
import { subjectApi } from "@/features/subject/subject.api";
import { examUploadApi, KIND_LABEL, type ExamGap, type ExamGapItem, type ExamKind } from "./exam-upload.api";
import { ExamUploadForm, type UploadTarget } from "./ExamUploadForm";

const GAP: Record<ExamGap, [string, Tone]> = {
  no_exam: ["Chưa có đề", "danger"],
  no_images: ["Chưa có ảnh", "warning"],
  no_answers: ["Chưa có đáp án", "info"],
};
const KINDS = Object.keys(KIND_LABEL) as ExamKind[];

const targetOf = (g: ExamGapItem): UploadTarget =>
  g.examId && g.gap !== "no_exam"
    ? { mode: "update", examId: g.examId, title: g.title, questions: g.questions ?? 0 }
    : { mode: "create", title: g.title, subjectCode: g.subjectCode, kind: g.kind, threadId: g.threadId };

// Đề còn thiếu thông tin (chưa có đề, chưa có ảnh, chưa có đáp án) để admin biết cần bổ sung gì
export default function ExamGapsPage() {
  const toast = useToast();
  const [url, setUrl] = useUrlState({ gap: "", kind: "", subject: "", q: "", page: "1" });
  const gap = (url.gap in GAP ? url.gap : "") as ExamGap | "";
  const kind = (KINDS.includes(url.kind as ExamKind) ? url.kind : "") as ExamKind | "";
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const [search, setSearch, q] = useUrlSearch(url.q, setUrl);

  const list = useApi(() => examUploadApi.gaps({ gap, kind, subject: url.subject, q, page }), [gap, kind, url.subject, q, page]);
  const summary = useApi(() => examUploadApi.summary(), []);
  const subjects = useApi(() => subjectApi.subjects(), []);
  useClampPage(list.data?.meta, setPage);
  const [open, setOpen] = useState<{ item: ExamGapItem; target: UploadTarget } | null>(null);
  const busy = useRef(false); // đang tải lên thì không cho đóng hộp thoại (Esc, bấm nền)
  const close = useCallback(() => {
    if (!busy.current) setOpen(null);
  }, []);

  const count = (n: number | undefined) => (n === undefined ? "" : ` (${n})`);
  const s = summary.data;
  const tabs: { value: ExamGap | ""; label: string }[] = [
    { value: "", label: "Tất cả" },
    { value: "no_exam", label: `Chưa có đề${count(s?.noExam)}` },
    { value: "no_images", label: `Chưa có ảnh${count(s?.noImages)}` },
    { value: "no_answers", label: `Chưa có đáp án${count(s?.noAnswers)}` },
  ];

  const badge = (g: ExamGapItem) => (GAP[g.gap] ? <Badge tone={GAP[g.gap][1]}>{GAP[g.gap][0]}</Badge> : null);
  const progress = (g: ExamGapItem) => (g.examId && g.questions > 0 ? `${g.answered ?? 0}/${g.questions} câu có đáp án` : null);
  const meta = (g: ExamGapItem) => [g.subjectCode, g.kind ? KIND_LABEL[g.kind] : null, g.postedAt ? formatDate(g.postedAt) : null].filter(Boolean).join(" · ");
  const actions = (g: ExamGapItem) => (
    <div className="flex items-center justify-end gap-1">
      <a href={g.sourceUrl ?? fuoThreadUrl(g.threadId)} target="_blank" rel="noopener noreferrer" aria-label={`Mở bài ${g.title} trên FuOverflow`} title="Mở bài trên FuOverflow" className={buttonClass({ variant: "text", size: "sm", className: "!px-2" })}>
        <ExternalLink size={16} aria-hidden />
      </a>
      {g.examId && (
        <Link to={`/admin/exams/${g.examId}`} aria-label={`Sửa đề ${g.title}`} title="Sửa đề" className={buttonClass({ variant: "text", size: "sm", className: "!px-2" })}>
          <Pencil size={16} aria-hidden />
        </Link>
      )}
      <Button size="sm" variant="primary" onClick={() => setOpen({ item: g, target: targetOf(g) })} aria-label={`Bổ sung đề ${g.title}`}>
        <FilePlus2 size={16} aria-hidden /> Bổ sung
      </Button>
    </div>
  );

  return (
    <>
      <PageHeader eyebrow="Quản trị" title="Đề cần bổ sung" description="Đề còn thiếu ảnh hoặc đáp án, và bài trên FuOverflow chưa có đề. Bấm Bổ sung để tải thư mục đề lên." />
      <Card>
        <div className="space-y-3 border-b border-outline-variant p-4">
          <Segmented<ExamGap | ""> label="Lọc theo phần còn thiếu" value={gap} onChange={(v) => setUrl({ gap: v, page: "1" })} options={tabs} />
          <div className="grid gap-3 sm:grid-cols-[1fr_14rem_10rem]">
            <div className="relative self-end">
              <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên đề" aria-label="Tìm theo tên đề" className={`${inputClass()} pl-9`} />
            </div>
            <SubjectCombobox label="Môn" subjects={subjects.error ? [] : (subjects.data ?? undefined)} value={url.subject} onChange={(v) => setUrl({ subject: v, page: "1" })} placeholder="Tất cả môn" />
            <Select label="Loại đề" value={kind} onChange={(e) => setUrl({ kind: e.target.value, page: "1" })}>
              <option value="">Tất cả</option>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <QueryBoundary query={list}>
          {(data) =>
            data.items.length === 0 ? (
              <Empty icon={SearchCheck} title="Không có đề nào cần bổ sung" />
            ) : (
              <>
                <ul className="divide-y divide-outline-variant md:hidden">
                  {data.items.map((g) => (
                    <li key={g.threadId} className="space-y-2 px-4 py-3">
                      <div className="md-title-small break-words text-on-surface">{g.title}</div>
                      <div className="md-body-small flex flex-wrap items-center gap-2 text-on-surface-variant">
                        {badge(g)}
                        <span>{meta(g)}</span>
                        {progress(g) && <span>{progress(g)}</span>}
                      </div>
                      {actions(g)}
                    </li>
                  ))}
                </ul>
                <div className="hidden md:block">
                  <Table>
                    <Thead>
                      <Th>Đề</Th>
                      <Th>Môn</Th>
                      <Th>Loại</Th>
                      <Th>Đăng lúc</Th>
                      <Th>Còn thiếu</Th>
                      <Th>
                        <span className="sr-only">Thao tác</span>
                      </Th>
                    </Thead>
                    <tbody>
                      {data.items.map((g) => (
                        <Tr key={g.threadId}>
                          <Td className="max-w-xs">
                            <div className="truncate font-medium text-on-surface" title={g.title}>
                              {g.title}
                            </div>
                            {progress(g) && <div className="text-xs text-on-surface-variant">{progress(g)}</div>}
                          </Td>
                          <Td>{g.subjectCode ?? "—"}</Td>
                          <Td>{g.kind ? <Badge>{KIND_LABEL[g.kind]}</Badge> : "—"}</Td>
                          <Td className="whitespace-nowrap text-on-surface-variant">{g.postedAt ? formatDate(g.postedAt) : "—"}</Td>
                          <Td>{badge(g)}</Td>
                          <Td>{actions(g)}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                <Pagination meta={data.meta} onPage={setPage} />
              </>
            )
          }
        </QueryBoundary>
      </Card>

      {open && (
        <Modal wide onClose={close}>
          <ModalTitle icon={FilePlus2}>{open.target.mode === "create" ? "Tạo đề từ thư mục" : "Bổ sung ảnh cho đề"}</ModalTitle>
          <div className="mt-4">
            <ExamUploadForm
              target={open.target}
              onBusy={(b) => {
                busy.current = b;
              }}
              onCancel={close}
              onDone={(r) => {
                setOpen(null);
                toast.success(`Đã lưu đề: ${r.questions} câu, ${r.answered} câu có đáp án`);
                list.reload();
                summary.reload();
              }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}

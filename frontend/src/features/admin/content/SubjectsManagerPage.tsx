import { useMemo, useState, type FormEvent } from "react";
import { BookMarked, Loader2, RotateCcw, Search, Sparkles } from "lucide-react";
import {
  adminApi,
  type SubjectDetail,
  type SubjectRow,
} from "@/features/admin/api/admin.api";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import {
  Card,
  CardHeader,
  PageHeader,
  StatCard,
  StatGrid,
} from "@/shared/ui/Card";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Input, Select, inputClass } from "@/shared/ui/Input";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";

const PAGE_SIZE = 40;
const SEMESTERS = Array.from({ length: 10 }, (_, i) => i);

const KIND_LABEL: Record<string, string> = {
  overview: "Mô tả",
  tasks: "Nhiệm vụ",
  materials: "Tài liệu",
  clo: "Chuẩn đầu ra",
  chapters: "Chương và mục",
  sessions: "Lịch học",
  cq: "Câu hỏi ôn",
  assessment: "Đánh giá",
};

function Facts({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="md-label-medium uppercase tracking-wider text-on-surface-variant">
            {k}
          </dt>
          <dd className="md-title-medium mt-0.5 tabular-nums text-on-surface">
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SectionTitle({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between gap-3">
      <h3 className="md-title-medium text-on-surface">{children}</h3>
      {aside}
    </div>
  );
}

// Hộp chi tiết một môn: sửa thông tin cơ bản, xem chương trong syllabus, chương AI suy ra, các đoạn nội dung syllabus
function SubjectDialog({
  code,
  onClose,
  onChanged,
}: {
  code: string;
  onClose: () => void;
  onChanged: (d: SubjectDetail) => void;
}) {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const detail = useApi(() => adminApi.subject(code), [code]);
  const [busy, setBusy] = useState(false);

  return (
    <Modal wide onClose={onClose}>
      <ModalTitle icon={BookMarked}>{code}</ModalTitle>
      {detail.data ? (
        <DialogBody
          d={detail.data}
          busy={busy}
          onSave={async (patch) => {
            setBusy(true);
            try {
              const next = await adminApi.updateSubject(code, patch);
              onChanged(next);
              detail.reload();
              toast.success("Đã lưu thông tin môn");
            } catch (err) {
              toast.error(errorMessage(err, "Chưa lưu được"));
            } finally {
              setBusy(false);
            }
          }}
          onResetInferred={async () => {
            const ok = await confirm({
              title: "Xóa bộ chương AI đã suy?",
              message:
                "Lần kế tiếp có người mở đề của môn này, AI sẽ suy lại chương từ syllabus (tốn một lượt gọi AI). Nhãn chương đã gắn cho các câu cũ không đổi.",
              confirmLabel: "Xóa để suy lại",
              tone: "danger",
            });
            if (!ok) return;
            setBusy(true);
            try {
              await adminApi.clearInferredChapters(code);
              const next = await adminApi.subject(code);
              onChanged(next);
              detail.reload();
              toast.success("Đã xóa bộ chương AI suy");
            } catch (err) {
              toast.error(errorMessage(err, "Chưa xóa được"));
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : detail.loading ? (
        <Loading />
      ) : (
        <ErrorBox
          message={detail.error ?? "Không tải được môn này"}
          onRetry={detail.reload}
        />
      )}
      <ModalActions>
        <Button variant="text" onClick={onClose}>
          Đóng
        </Button>
      </ModalActions>
      {confirmDialog}
    </Modal>
  );
}

function DialogBody({
  d,
  busy,
  onSave,
  onResetInferred,
}: {
  d: SubjectDetail;
  busy: boolean;
  onSave: (patch: {
    name: string;
    credits: number | null;
    semester: number | null;
  }) => Promise<void>;
  onResetInferred: () => Promise<void>;
}) {
  const [name, setName] = useState(d.name);
  const [credits, setCredits] = useState(
    d.credits === null ? "" : String(d.credits),
  );
  const [semester, setSemester] = useState(
    d.semester === null ? "" : String(d.semester),
  );
  const [openKind, setOpenKind] = useState(false);
  const dirty =
    name !== d.name ||
    credits !== (d.credits === null ? "" : String(d.credits)) ||
    semester !== (d.semester === null ? "" : String(d.semester));
  const real = d.chapters.filter((c) => c.number > 0);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void onSave({
      name: name.trim(),
      credits: credits === "" ? null : Number(credits),
      semester: semester === "" ? null : Number(semester),
    });
  };

  return (
    <div className="mt-4">
      <Facts
        items={[
          ["Đề trong hệ thống", d.exams],
          ["Đề trên kho đề", d.fuoThreads],
          ["Điểm qua môn", d.minPassMark ?? "—"],
          ["Mã syllabus", d.syllabusId ?? "—"],
        ]}
      />

      <form
        onSubmit={submit}
        className="mt-5 grid gap-3 sm:grid-cols-[1fr_9rem_10rem_auto] sm:items-end"
      >
        <Input
          label="Tên môn"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
        />
        <Input
          label="Tín chỉ"
          type="number"
          min={0}
          max={30}
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
        />
        <Select
          label="Kỳ học"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
        >
          <option value="">Chưa phân loại</option>
          {SEMESTERS.map((k) => (
            <option key={k} value={k}>
              Kỳ {k}
            </option>
          ))}
        </Select>
        <Button
          type="submit"
          variant="primary"
          disabled={!dirty || busy || !name.trim()}
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : null} Lưu
        </Button>
      </form>

      <SectionTitle aside={<Badge>{real.length} chương</Badge>}>
        Chương trong syllabus
      </SectionTitle>
      {real.length === 0 ? (
        <p className="md-body-medium rounded-m3-md bg-surface-container px-4 py-3 text-on-surface-variant">
          Syllabus không có chương nào.
        </p>
      ) : (
        <ul className="divide-y divide-outline-variant overflow-hidden rounded-m3-md border border-outline-variant">
          {real.map((c) => (
            <li key={c.number} className="flex gap-3 px-4 py-2.5">
              <span className="md-title-small w-8 shrink-0 text-primary">
                {c.number}
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className={`md-body-large ${c.title.trim() ? "text-on-surface" : "italic text-on-surface-variant"}`}
                >
                  {c.title.trim() || "(không có tên)"}
                </div>
                {c.topics.length > 0 && (
                  <div className="md-body-small mt-0.5 text-on-surface-variant">
                    {c.topics.length} mục: {c.topics.slice(0, 4).join("; ")}
                    {c.topics.length > 4 ? "…" : ""}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <SectionTitle
        aside={
          d.inferred ? (
            <Button
              size="sm"
              variant="outlined"
              disabled={busy}
              onClick={() => void onResetInferred()}
            >
              <RotateCcw size={14} /> Xóa để suy lại
            </Button>
          ) : undefined
        }
      >
        <span className="inline-flex items-center gap-2">
          <Sparkles size={16} className="text-primary" /> Chương do AI suy ra
        </span>
      </SectionTitle>
      {d.inferred ? (
        <>
          <ul className="divide-y divide-outline-variant overflow-hidden rounded-m3-md border border-outline-variant">
            {d.inferred.topics.map((t) => (
              <li key={t.label} className="px-4 py-2.5">
                <div className="md-body-large text-on-surface">{t.label}</div>
                {t.hint && (
                  <div className="md-body-small mt-0.5 text-on-surface-variant">
                    {t.hint}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="md-body-small mt-1.5 text-on-surface-variant">
            Suy lúc {new Date(d.inferred.at).toLocaleString("vi-VN")}
            {d.inferred.model ? `, bằng ${d.inferred.model}` : ""}. Các đề của
            môn này dùng chung bộ chương trên.
          </p>
        </>
      ) : (
        <p className="md-body-medium rounded-m3-md bg-surface-container px-4 py-3 text-on-surface-variant">
          {d.chapters.some((c) => c.number > 0 && c.title.trim())
            ? "Môn đã có tên chương trong syllabus nên không cần AI suy."
            : "Chưa suy. Sẽ tự suy khi có người mở đề của môn này."}
        </p>
      )}

      <SectionTitle
        aside={
          <button
            type="button"
            className="md-label-large text-primary"
            onClick={() => setOpenKind((o) => !o)}
          >
            {openKind ? "Thu gọn" : "Xem danh sách"}
          </button>
        }
      >
        Nội dung syllabus đã crawl ({d.chunks.length} đoạn)
      </SectionTitle>
      {openKind && (
        <ul className="divide-y divide-outline-variant overflow-hidden rounded-m3-md border border-outline-variant">
          {d.chunks.map((c, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2">
              <Badge>{KIND_LABEL[c.kind] ?? c.kind}</Badge>
              <span className="md-body-medium min-w-0 flex-1 truncate text-on-surface">
                {c.title}
              </span>
              <span className="md-body-small shrink-0 tabular-nums text-on-surface-variant">
                {c.length.toLocaleString("vi-VN")} ký tự
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SubjectsTable({ initial }: { initial: SubjectRow[] }) {
  const toast = useToast();
  const [url, setUrl] = useUrlState({
    q: "",
    ky: "all",
    page: "1",
    mon: "",
  });
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  const stats = useMemo(() => {
    const classified = rows.filter((s) => s.semester !== null).length;
    return {
      classified,
      unclassified: rows.length - classified,
      withExams: rows.filter((s) => s.exams > 0).length,
    };
  }, [rows]);

  const needle = url.q.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      rows.filter((s) => {
        if (
          needle &&
          !s.code.toLowerCase().includes(needle) &&
          !s.name.toLowerCase().includes(needle)
        )
          return false;
        if (
          url.ky === "none"
            ? s.semester !== null
            : url.ky !== "all" && s.semester !== Number(url.ky)
        )
          return false;
        return true;
      }),
    [rows, needle, url.ky],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(url.page) || 1), pages);
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const patchRow = (code: string, p: Partial<SubjectRow>) =>
    setRows((all) => all.map((s) => (s.code === code ? { ...s, ...p } : s)));

  const setSemester = async (code: string, value: string) => {
    const semester = value === "" ? null : Number(value);
    setBusy(code);
    try {
      await adminApi.updateSubject(code, { semester });
      patchRow(code, { semester });
      toast.success(
        semester === null
          ? `Đã đưa ${code} về Chưa phân loại`
          : `Đã xếp ${code} vào Kỳ ${semester}`,
      );
    } catch (err) {
      toast.error(errorMessage(err, "Chưa cập nhật được"));
    } finally {
      setBusy(null);
    }
  };

  const filterChange = (patch: Partial<Record<"q" | "ky", string>>) =>
    setUrl({ ...patch, page: "1" });

  return (
    <div className="space-y-4">
      <StatGrid className="grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng số môn" value={rows.length} />
        <StatCard label="Đã xếp kỳ" value={stats.classified} tone="emerald" />
        <StatCard
          label="Chưa phân loại"
          value={stats.unclassified}
          tone="amber"
        />
        <StatCard
          label="Môn đã có đề"
          value={stats.withExams}
          note="Có đề trong hệ thống"
        />
      </StatGrid>

      <Card>
        <CardHeader
          title="Danh sách môn học"
          description="Bấm vào một dòng để xem chi tiết chương, syllabus và chỉnh thông tin môn. Đổi kỳ ngay trên bảng."
        />
        <div className="grid gap-3 border-b border-outline-variant p-4 sm:grid-cols-[1fr_12rem]">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              value={url.q}
              onChange={(e) => filterChange({ q: e.target.value })}
              placeholder="Tìm theo mã hoặc tên môn"
              aria-label="Tìm môn"
              className={`${inputClass()} !h-10 w-full pl-10`}
            />
          </div>
          <select
            value={url.ky}
            onChange={(e) => filterChange({ ky: e.target.value })}
            aria-label="Lọc theo kỳ"
            className={`${inputClass()} !h-10`}
          >
            <option value="all">Mọi kỳ</option>
            {SEMESTERS.map((k) => (
              <option key={k} value={k}>
                Kỳ {k}
              </option>
            ))}
            <option value="none">Chưa phân loại</option>
          </select>
        </div>

        {shown.length === 0 ? (
          <Empty icon={Search} title="Không có môn nào khớp" />
        ) : (
          <Table>
            <Thead>
              <Th>Môn</Th>
              <Th>Kỳ</Th>
              <Th>Tín chỉ</Th>
              <Th>Chương</Th>
              <Th>Syllabus</Th>
              <Th>Đề trong hệ thống</Th>
              <Th>Đề trên kho</Th>
            </Thead>
            <tbody>
              {shown.map((s) => {
                return (
                  <Tr key={s.code} onClick={() => setUrl({ mon: s.code })}>
                    <Td className="max-w-[18rem]">
                      <span className="md-title-small text-primary">
                        {s.code}
                      </span>
                      {s.hasIssue && (
                        <span className="ml-2 align-middle">
                          <Badge tone="danger">Bị báo thiếu</Badge>
                        </span>
                      )}
                      <span className="md-body-small block truncate text-on-surface-variant">
                        {s.name}
                      </span>
                    </Td>
                    <Td onClick={(e) => e.stopPropagation()}>
                      <select
                        aria-label={`Kỳ của ${s.code}`}
                        value={s.semester ?? ""}
                        disabled={busy === s.code}
                        onChange={(e) =>
                          void setSemester(s.code, e.target.value)
                        }
                        className={`${inputClass()} !h-9 w-36`}
                      >
                        <option value="">Chưa phân loại</option>
                        {SEMESTERS.map((k) => (
                          <option key={k} value={k}>
                            Kỳ {k}
                          </option>
                        ))}
                      </select>
                    </Td>
                    <Td className="tabular-nums">{s.credits ?? "—"}</Td>
                    <Td className="tabular-nums">
                      {s.inferredChapters > 0 && !s.chapters.hasNames
                        ? s.inferredChapters
                        : s.chapters.total}
                    </Td>
                    <Td className="tabular-nums">
                      {s.syllabusChunks > 0 ? `${s.syllabusChunks} đoạn` : "—"}
                    </Td>
                    <Td className="tabular-nums">{s.exams}</Td>
                    <Td className="tabular-nums">{s.fuoThreads}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}

        <div className="flex items-center justify-between border-t border-outline-variant px-5 py-3 text-xs text-on-surface-variant">
          <span>
            {filtered.length} môn · trang {page}/{pages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outlined"
              disabled={page <= 1}
              onClick={() => setUrl({ page: String(page - 1) })}
            >
              Trước
            </Button>
            <Button
              size="sm"
              variant="outlined"
              disabled={page >= pages}
              onClick={() => setUrl({ page: String(page + 1) })}
            >
              Sau
            </Button>
          </div>
        </div>
      </Card>

      {url.mon && (
        <SubjectDialog
          code={url.mon}
          onClose={() => setUrl({ mon: "" })}
          onChanged={(d) =>
            patchRow(d.code, {
              name: d.name,
              credits: d.credits,
              semester: d.semester,
              inferredChapters: d.inferred?.topics.length ?? 0,
            })
          }
        />
      )}
    </div>
  );
}

export default function SubjectsManagerPage() {
  const list = useApi(() => adminApi.subjects(), []);
  return (
    <>
      <PageHeader
        eyebrow="Quản trị"
        title="Quản lý môn học"
        description="Toàn bộ môn trong hệ thống: kỳ học, số chương, tình trạng syllabus và số đề của từng môn."
      />
      {list.data ? (
        <SubjectsTable initial={list.data.subjects} />
      ) : list.loading ? (
        <Loading />
      ) : (
        <ErrorBox
          message={list.error ?? "Không tải được danh sách môn"}
          onRetry={list.reload}
        />
      )}
    </>
  );
}

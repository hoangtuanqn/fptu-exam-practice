import { useMemo, useState, type FormEvent } from "react";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { adminApi, type BoardSubject } from "@/features/admin/api/admin.api";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { inputClass } from "@/shared/ui/Input";

const SEMESTERS = Array.from({ length: 10 }, (_, i) => i);
const NONE = "none"; // tab "Chưa phân loại"

// Quản lý môn theo kỳ: chọn Kỳ 0 đến Kỳ 9, xem các môn của kỳ đó, thêm môn vào kỳ hoặc xóa môn khỏi kỳ (về "Chưa phân loại").
function Board({ initial }: { initial: BoardSubject[] }) {
  const toast = useToast();
  const [url, setUrl] = useUrlState({ ky: "0" });
  const [subjects, setSubjects] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState("");
  const [filter, setFilter] = useState("");

  const tab = url.ky === NONE ? NONE : /^[0-9]$/.test(url.ky) ? Number(url.ky) : 0;
  const bySemester = useMemo(() => {
    const m = new Map<number | null, BoardSubject[]>();
    for (const s of subjects) (m.get(s.semester) ?? m.set(s.semester, []).get(s.semester)!).push(s);
    return m;
  }, [subjects]);
  const current = bySemester.get(tab === NONE ? null : tab) ?? [];
  const needle = filter.trim().toLowerCase();
  const shown = needle ? current.filter((s) => s.code.toLowerCase().includes(needle) || s.name.toLowerCase().includes(needle)) : current;

  const assign = async (code: string, semester: number | null) => {
    const subject = subjects.find((s) => s.code === code);
    if (!subject) return toast.error(`Không có môn ${code} trong hệ thống`);
    if (subject.semester === semester) return toast.error(`${code} đã ở ${semester === null ? "Chưa phân loại" : `Kỳ ${semester}`} rồi`);
    setBusy(code);
    try {
      await adminApi.setSubjectSemester(code, semester);
      setSubjects((all) => all.map((s) => (s.code === code ? { ...s, semester } : s)));
      toast.success(semester === null ? `Đã xóa ${code} khỏi Kỳ ${subject.semester}` : subject.semester === null ? `Đã thêm ${code} vào Kỳ ${semester}` : `Đã chuyển ${code} từ Kỳ ${subject.semester} sang Kỳ ${semester}`);
    } catch (err) {
      toast.error(errorMessage(err, "Chưa cập nhật được"));
    } finally {
      setBusy(null);
    }
  };

  const onAdd = (e: FormEvent) => {
    e.preventDefault();
    const code = adding.trim().toUpperCase().split(/[\s—-]/)[0] ?? "";
    if (!code || tab === NONE) return;
    void assign(code, tab).then(() => setAdding(""));
  };

  // Gợi ý khi thêm: các môn chưa thuộc kỳ đang xem (môn của kỳ khác sẽ được chuyển sang)
  const options = tab === NONE ? [] : subjects.filter((s) => s.semester !== tab);

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Chọn kỳ" className="flex flex-wrap gap-1.5">
        {SEMESTERS.map((k) => (
          <TabButton key={k} on={tab === k} onClick={() => setUrl({ ky: String(k) })} label={`Kỳ ${k}`} count={bySemester.get(k)?.length ?? 0} />
        ))}
        <TabButton on={tab === NONE} onClick={() => setUrl({ ky: NONE })} label="Chưa phân loại" count={bySemester.get(null)?.length ?? 0} />
      </div>

      <Card>
        <CardHeader
          title={tab === NONE ? "Môn chưa phân loại" : `Kỳ ${tab}`}
          description={tab === NONE ? "Các môn chưa thuộc kỳ nào. Chọn kỳ ở cột bên phải để xếp môn vào kỳ." : `${current.length} môn. Thêm môn vào kỳ này hoặc xóa môn khỏi kỳ (môn sẽ về “Chưa phân loại”).`}
        />

        {tab !== NONE && (
          <form onSubmit={onAdd} className="flex flex-wrap items-center gap-2 border-b border-outline-variant p-4">
            <input
              list="semester-subject-options"
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              placeholder="Gõ mã môn để thêm, ví dụ PRF192"
              aria-label="Mã môn cần thêm"
              className={`${inputClass()} !h-10 w-full sm:w-80`}
            />
            <datalist id="semester-subject-options">
              {options.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                  {s.semester !== null ? ` (đang ở Kỳ ${s.semester})` : ""}
                </option>
              ))}
            </datalist>
            <Button type="submit" variant="primary" disabled={!adding.trim() || busy !== null}>
              <Plus size={16} /> Thêm vào Kỳ {tab}
            </Button>
          </form>
        )}

        {current.length > 12 && (
          <div className="relative border-b border-outline-variant p-4">
            <Search size={16} className="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Lọc trong danh sách" aria-label="Lọc môn" className={`${inputClass()} !h-10 w-full pl-10 sm:w-80`} />
          </div>
        )}

        {shown.length === 0 ? (
          <Empty icon={Search} title={current.length === 0 ? "Chưa có môn nào" : "Không có môn nào khớp"}>
            {current.length === 0 && tab !== NONE ? "Gõ mã môn ở ô phía trên để thêm môn vào kỳ này." : undefined}
          </Empty>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {shown.map((s) => (
              <li key={s.code} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
                <span className="md-title-small w-24 shrink-0 text-primary">{s.code}</span>
                <span className="md-body-medium min-w-0 flex-1 truncate text-on-surface-variant">{s.name}</span>
                {tab === NONE ? (
                  <select
                    aria-label={`Xếp ${s.code} vào kỳ`}
                    value=""
                    disabled={busy === s.code}
                    onChange={(e) => e.target.value !== "" && void assign(s.code, Number(e.target.value))}
                    className={`${inputClass()} !h-9 w-40`}
                  >
                    <option value="">Chọn kỳ…</option>
                    {SEMESTERS.map((k) => (
                      <option key={k} value={k}>
                        Kỳ {k}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Button size="sm" variant="text" disabled={busy === s.code} onClick={() => void assign(s.code, null)} aria-label={`Xóa ${s.code} khỏi Kỳ ${tab}`}>
                    {busy === s.code ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Xóa
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function TabButton({ on, onClick, label, count }: { on: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={`md-state md-label-large inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 ${on ? "border-transparent bg-secondary-container text-on-secondary-container" : "border-outline text-on-surface"}`}
    >
      {label}
      <span className="text-on-surface-variant">{count}</span>
    </button>
  );
}

export default function LibrarySettingsPage() {
  const board = useApi(() => adminApi.librarySubjects(), []);
  return (
    <>
      <PageHeader title="Kỳ học của môn" description="Xếp môn vào Kỳ 0 đến Kỳ 9 để trang Kho đề lọc theo kỳ. Môn chưa xếp nằm ở “Chưa phân loại”." />
      {board.data ? <Board initial={board.data.subjects} /> : board.loading ? <Loading /> : <ErrorBox message={board.error ?? "Không tải được danh sách môn"} onRetry={board.reload} />}
    </>
  );
}

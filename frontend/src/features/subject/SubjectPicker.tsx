import { useMemo, useState, type ReactNode } from "react";
import { BookOpen, Search } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";

export interface PickableSubject {
  code: string;
  name: string | null;
  badge?: string; // chữ nhỏ ở cuối dòng, ví dụ "38 đề"
}

interface Props {
  title?: string;
  subjects: PickableSubject[] | undefined;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onPick: (code: string, subject: PickableSubject) => void;
  mine?: string[]; // mã các môn hay dùng, hiện thành nút bấm nhanh ở đầu (khi chưa gõ tìm)
  emptyHint?: ReactNode; // nội dung khi không có môn nào khớp
}

// Bộ chọn môn dùng chung cho Kho đề, Bộ đề theo chương và Câu hay ra: ô tìm kiếm, nút bấm nhanh cho môn hay dùng,
// số môn đang hiện và danh sách cuộn được (hiện đủ mọi môn, không cắt bớt) để người dùng biết còn nữa.
export function SubjectPicker({ title = "Chọn môn", subjects, loading, error, onRetry, onPick, mine = [], emptyHint }: Props) {
  const [q, setQ] = useState("");
  const all = subjects ?? [];
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? all.filter((s) => s.code.toLowerCase().includes(term) || (s.name ?? "").toLowerCase().includes(term)) : all;
  }, [all, q]);
  const byCode = useMemo(() => new Map(all.map((s) => [s.code, s])), [all]);
  const quick = mine.map((c) => byCode.get(c)).filter((s): s is PickableSubject => !!s);

  return (
    <Card>
      <CardHeader title={title} />
      <div className="space-y-4 p-5">
        {quick.length > 0 && !q.trim() && (
          <div>
            <p className="md-label-large mb-2 text-on-surface-variant">Môn của tôi</p>
            <div className="flex flex-wrap gap-2">
              {quick.map((s) => (
                <button key={s.code} type="button" onClick={() => onPick(s.code, s)} className="md-state inline-flex h-9 items-center gap-2 rounded-full border border-outline-variant px-4 text-sm font-medium text-on-surface">
                  {s.code}
                  {s.badge && <span className="text-xs font-normal text-on-surface-variant">{s.badge}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm môn theo mã hoặc tên, ví dụ PRO192"
            aria-label="Tìm môn"
            className="h-11 w-full rounded-m3-md border border-outline-variant bg-surface-container-lowest pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>

        {loading && !subjects ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={onRetry} />
        ) : shown.length === 0 ? (
          <Empty icon={BookOpen} title="Chưa có môn nào khớp">
            {emptyHint ?? "Thử mã môn khác."}
          </Empty>
        ) : (
          <>
            <p className="md-body-small text-on-surface-variant" aria-live="polite">
              {q.trim() ? `Tìm thấy ${shown.length}/${all.length} môn.` : `Có ${shown.length} môn. Cuộn xuống để xem hết, hoặc gõ vào ô trên để tìm.`}
            </p>
            <div className="max-h-[28rem] overflow-y-auto rounded-m3-md border border-outline-variant p-2" tabIndex={0} aria-label="Danh sách môn, cuộn để xem thêm">
              <ul className="grid gap-2 sm:grid-cols-2">
                {shown.map((s) => (
                  <li key={s.code}>
                    <button type="button" onClick={() => onPick(s.code, s)} className="md-state flex w-full items-center gap-3 rounded-m3-md border border-outline-variant px-4 py-3 text-left">
                      <span className="md-title-small w-20 shrink-0 text-primary">{s.code}</span>
                      <span className="md-body-medium min-w-0 flex-1 truncate text-on-surface">{s.name ?? "Môn học"}</span>
                      {s.badge && <Badge tone="info">{s.badge}</Badge>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

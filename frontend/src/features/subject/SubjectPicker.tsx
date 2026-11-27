import { memo, useMemo, useState, type ReactNode } from "react";
import { BookOpen } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { SearchStatusIcon } from "@/shared/ui/SearchStatusIcon";
import { useSlow } from "@/shared/hooks/useSlow";
import { useSubjectSearch } from "./useSubjectSearch";

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

// Một dòng môn. memo: gõ thêm phím không vẽ lại các dòng vẫn còn khớp.
// content-visibility: trình duyệt bỏ qua dòng đang ngoài khung cuộn, nên đủ cả trăm môn mà vẫn nhẹ.
const Row = memo(function Row({ subject, onPick }: { subject: PickableSubject; onPick: Props["onPick"] }) {
  return (
    <li className="[contain-intrinsic-size:auto_52px] [content-visibility:auto]">
      <button type="button" onClick={() => onPick(subject.code, subject)} className="md-state flex w-full items-center gap-3 rounded-m3-md border border-outline-variant px-4 py-3 text-left">
        <span className="md-title-small w-20 shrink-0 text-primary">{subject.code}</span>
        <span className="md-body-medium min-w-0 flex-1 truncate text-on-surface">{subject.name ?? "Môn học"}</span>
        {subject.badge && <Badge tone="info">{subject.badge}</Badge>}
      </button>
    </li>
  );
});

// Bộ chọn môn dùng chung cho Kho đề, Bộ đề theo chương và Câu hay ra: ô tìm kiếm, nút bấm nhanh cho môn hay dùng,
// số môn đang hiện và danh sách cuộn được (hiện đủ mọi môn, không cắt bớt) để người dùng biết còn nữa.
export function SubjectPicker({ title = "Chọn môn", subjects, loading, error, onRetry, onPick, mine = [], emptyHint }: Props) {
  const [q, setQ] = useState("");
  const { results: shown, term, stale } = useSubjectSearch(subjects, q);
  const slow = useSlow(stale);
  const total = subjects?.length ?? 0;
  const byCode = useMemo(() => new Map((subjects ?? []).map((s) => [s.code, s])), [subjects]);
  const quick = mine.map((c) => byCode.get(c)).filter((s): s is PickableSubject => !!s);

  return (
    <Card>
      <CardHeader title={title} />
      <div className="space-y-4 p-5">
        {quick.length > 0 && !term && (
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
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            <SearchStatusIcon busy={stale} />
          </span>
          <input
            data-search
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
              {term ? `Tìm thấy ${shown.length}/${total} môn.` : `Có ${shown.length} môn. Cuộn xuống để xem hết, hoặc gõ vào ô trên để tìm.`}
            </p>
            <div className={`max-h-[28rem] overflow-y-auto rounded-m3-md border border-outline-variant p-2 transition-opacity ${slow ? "opacity-60" : ""}`} aria-busy={slow} tabIndex={0} aria-label="Danh sách môn, cuộn để xem thêm">
              <ul className="grid gap-2 sm:grid-cols-2">
                {shown.map((s) => (
                  <Row key={s.code} subject={s} onPick={onPick} />
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

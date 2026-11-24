import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { formatDate } from "@/shared/utils/formatters";
import type { CatalogItem } from "./catalog.api";
import { ExamKindBadge } from "./ExamKindBadge";
import { NewExamBadge } from "./NewExamBadge";

// Một dòng đề trong Kho đề. Người đã đăng nhập: đề chưa làm có chấm xanh và tên đậm, đề đã làm thì nhạt đi.
// Khách (known = false) chưa có lịch sử nên mọi đề hiện như nhau.
export function ExamRow({ item: e, known, action }: { item: CatalogItem; known: boolean; action: ReactNode }) {
  const done = known && !!(e.attempts || e.opened);
  const fresh = known && !done;
  return (
    <li className={`group flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 transition hover:bg-surface-container-low/70 ${done ? "bg-surface-container-lowest/40" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <ExamKindBadge kind={e.kind} />
          {fresh && <span aria-label="Chưa làm" title="Chưa làm" className="size-2 shrink-0 rounded-full bg-primary" />}
          {/* Mobile: nhãn lên trước, tiêu đề xuống dòng riêng để đọc được; từ sm trở lên nằm cùng một hàng */}
          <p
            className={`md-title-small order-last line-clamp-2 basis-full break-words sm:order-none sm:line-clamp-1 sm:min-w-0 sm:flex-1 sm:basis-0 ${fresh ? "font-bold text-on-surface" : done ? "font-normal text-on-surface-variant" : "text-on-surface"}`}
            title={e.title}
          >
            {e.title}
          </p>
          <NewExamBadge term={e.term} />
        </div>
        <p className="md-body-small mt-0.5 flex flex-wrap items-center gap-x-2 text-on-surface-variant">
          {e.term && <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs font-medium">{e.term}</span>}
          {e.postedAt && <span>{formatDate(e.postedAt)}</span>}
          {e.questions ? <span>· {e.questions} câu</span> : null}
          {done && (
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
              <Check size={13} /> {e.attempts ? `Đã làm${e.attempts > 1 ? ` ${e.attempts} lần` : ""}` : "Đã xem"}
            </span>
          )}
        </p>
      </div>
      <div className="shrink-0">{action}</div>
    </li>
  );
}

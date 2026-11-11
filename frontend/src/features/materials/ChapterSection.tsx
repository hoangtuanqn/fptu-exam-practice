import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, ChevronDown } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { confidenceOf } from "@/features/frequent/confidence";
import type { Figure, MaterialChapter } from "./materials.api";

// Loại hình AI hay trả về; loại lạ thì không ghi nhãn
const FIGURE_TYPE: Record<string, string> = {
  diagram: "Sơ đồ",
  flowchart: "Lưu đồ",
  table: "Bảng",
  chart: "Biểu đồ",
  screenshot: "Ảnh chụp màn hình",
  photo: "Ảnh",
  code: "Đoạn mã",
  scanned_text: "Chữ trong ảnh",
};

const slides = (pages: number[] | undefined) =>
  pages && pages.length > 0 ? `Slide ${pages.join(", ")}` : null;

function StatsLine({ stats }: { stats: MaterialChapter["stats"] }) {
  if (!stats)
    return (
      <p className="md-body-small text-on-surface-variant">
        Chưa có thống kê đề cho chương này.
      </p>
    );
  const seen = Math.max(0, stats.examsWithChapter ?? 0);
  const of = Math.max(0, stats.totalExams ?? 0);
  const confidence = confidenceOf(stats.confidence);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="md-body-small text-on-surface-variant">
        Xuất hiện trong{" "}
        <b className="text-on-surface">
          {seen}/{of}
        </b>{" "}
        đề
      </p>
      {confidence && <Badge tone={confidence.tone}>{confidence.label}</Badge>}
    </div>
  );
}

function FigureItem({ figure }: { figure: Figure }) {
  const key = typeof figure.type === "string" ? figure.type.trim().toLowerCase() : "";
  const type = Object.prototype.hasOwnProperty.call(FIGURE_TYPE, key) ? FIGURE_TYPE[key] : undefined;
  const unsure = figure.confidence === "low" || figure.confidence === "medium";
  return (
    <li className="space-y-1">
      <p className="md-label-large text-on-surface">
        Slide {figure.page}
        {type && ` · ${type}`}
      </p>
      <p className="md-body-medium whitespace-pre-line break-words text-on-surface-variant">
        {figure.summary}
      </p>
      {unsure && (
        <p className="md-body-small flex items-start gap-1.5 text-on-warning-container">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> AI chưa chắc,
          kiểm tra lại với slide
        </p>
      )}
    </li>
  );
}

export function ChapterSection({
  chapter,
  subjectCode,
}: {
  chapter: MaterialChapter;
  subjectCode: string | null;
}) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const keyPoints = Array.isArray(chapter.keyPoints) ? chapter.keyPoints : [];
  const figures = Array.isArray(chapter.figures) ? chapter.figures : [];
  const title = chapter.title?.trim() || "Chưa rõ tên chương";

  return (
    <li className="overflow-hidden rounded-m3-md border border-outline-variant">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="md-state flex min-h-12 w-full items-start justify-between gap-3 px-4 pt-3 text-left"
      >
        <span className="min-w-0">
          <span className="md-title-small block break-words text-on-surface">
            Chương {chapter.number}: {title}
          </span>
          {chapter.pageRange && (
            <span className="md-body-small block text-on-surface-variant">
              Slide {chapter.pageRange}
            </span>
          )}
        </span>
        <ChevronDown
          size={18}
          className={`mt-0.5 shrink-0 text-on-surface-variant transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div className="px-4 pb-3 pt-1">
        <StatsLine stats={chapter.stats} />
      </div>

      <div
        id={bodyId}
        hidden={!open}
        className="space-y-4 border-t border-outline-variant px-4 py-4"
      >
        {chapter.summary && (
          <p className="md-body-medium whitespace-pre-line break-words text-on-surface">
            {chapter.summary}
          </p>
        )}

        {keyPoints.length > 0 && (
          <div>
            <p className="md-label-large mb-2 text-on-surface">Ý chính</p>
            <ul className="md-body-medium list-disc space-y-1.5 pl-5 text-on-surface">
              {keyPoints.map((k, i) => (
                <li key={i} className="break-words">
                  {k.text}
                  {slides(k.pages) && (
                    <span className="md-body-small text-on-surface-variant">
                      {" "}
                      ({slides(k.pages)})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {figures.length > 0 && (
          <details className="rounded-m3-md bg-surface-container-low">
            <summary className="md-label-large flex min-h-10 cursor-pointer list-none items-center gap-2 px-4 text-on-surface-variant hover:text-on-surface">
              <ChevronDown size={16} /> Hình và bảng trong chương (
              {figures.length})
            </summary>
            <ul className="space-y-3 px-4 pb-4">
              {figures.map((f, i) => (
                <FigureItem key={`${f.page}-${i}`} figure={f} />
              ))}
            </ul>
          </details>
        )}

        {subjectCode && (
          <Link
            to={`/account/frequent?subject=${encodeURIComponent(subjectCode)}`}
            className="md-label-large inline-flex min-h-10 items-center gap-1 text-primary hover:underline"
          >
            Xem câu hay ra môn {subjectCode} <ArrowRight size={14} />
          </Link>
        )}
      </div>
    </li>
  );
}

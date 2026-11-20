import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Flame } from "lucide-react";
import { catalogApi } from "@/features/exam-store/catalog.api";
import { ExamKindBadge } from "@/features/exam-store/ExamKindBadge";
import { NewExamBadge } from "@/features/exam-store/NewExamBadge";
import { useApi } from "@/shared/hooks/useApi";

export const PICK_SECTION_ID = "chon-de"; // id khối "Chọn môn và đề" (ExamSourcePicker), đích cuộn khi bấm một đề

const FRESH_DAYS = 30; // chỉ coi là "mới" khi đăng trong chừng này ngày; đề cũ hơn thì không bày ra như thể mới

const DAY_MS = 86_400_000;

// Bấm một đề: địa chỉ đổi sang ?subject=..., khối chọn môn phía trên nạp môn đó. Cuộn khối ấy lên đầu để người dùng thấy ngay,
// kể cả khi môn đã đang được chọn. Mở tab mới (Ctrl/Shift/Cmd) thì không cuộn trang hiện tại.
function scrollToPicker(ev: MouseEvent) {
  if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey) return;
  requestAnimationFrame(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    document
      .getElementById(PICK_SECTION_ID)
      ?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
  });
}

// Khối "Đề mới đăng": các đề vừa được đăng gần đây, lấy từ danh mục thật. Người học sắp thi sẽ muốn biết đề kỳ này đã có chưa,
// nên đây là lý do để mở web ngay thay vì để sau. Không có đề đăng trong FRESH_DAYS ngày gần đây thì ẩn hẳn (không dựng số liệu).
export function LatestExamsStrip() {
  const { data, loading } = useApi(() => catalogApi.latest(), []);
  const now = Date.now();
  const fresh = (data ?? []).filter(
    (e) => now - new Date(e.postedAt).getTime() <= FRESH_DAYS * DAY_MS,
  );
  // Đang tải: giữ chỗ để khi danh sách về không đẩy nội dung bên dưới (CLS)
  if (!data && loading) return <div aria-hidden className="mt-8 h-44 rounded-m3-lg border border-outline-variant bg-surface-container-lowest" />;
  if (fresh.length === 0) return null;

  return (
    <section
      aria-labelledby="latest-exams-title"
      className="mt-8 overflow-hidden rounded-m3-lg border border-outline-variant bg-surface-container-lowest shadow-m3-1"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-warning-container/50 px-4 py-3">
        <h2
          id="latest-exams-title"
          className="md-title-small flex items-center gap-2 text-on-surface"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-warning-container">
            <Flame size={18} className="text-[#e89a00]" aria-hidden />
          </span>
          Mới đăng gần đây
        </h2>
        <p className="md-label-medium flex items-center gap-1.5 text-on-surface-variant">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full bg-success motion-safe:animate-pulse"
          />
          Cập nhật mới nhất
        </p>
      </div>
      <ul className="grid gap-2.5 p-3 sm:grid-cols-2 sm:p-4">
        {fresh.map((e) => (
          <li key={e.threadId} className="min-w-0">
            <Link
              to={`/?subject=${encodeURIComponent(e.subjectCode)}`}
              onClick={scrollToPicker}
              className="md-state group flex min-h-14 items-start sm:items-center gap-3 rounded-m3-md border border-outline-variant/70 bg-surface px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-[#e0a100]/70 hover:shadow-m3-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span className="min-w-0 flex-1">
                <span
                  className="md-label-large line-clamp-2 break-words text-on-surface"
                  title={e.title}
                >
                  {e.title}
                </span>
                <span className="md-label-small mt-1 flex flex-wrap items-center gap-1.5 text-on-surface-variant">
                  {/* Máy chủ cũ chưa trả loại đề: không đoán, bỏ nhãn */}
                  {e.kind && <ExamKindBadge kind={e.kind} />}
                  <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-semibold text-on-surface">
                    {e.subjectCode}
                  </span>
                  <NewExamBadge term={e.term} />
                </span>
              </span>
              <ChevronRight
                size={18}
                className="shrink-0 self-center text-on-surface-variant transition group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

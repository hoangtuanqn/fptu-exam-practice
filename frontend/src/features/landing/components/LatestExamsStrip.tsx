import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import { catalogApi } from "@/features/exam-store/catalog.api";
import { useApi } from "@/shared/hooks/useApi";

const FRESH_DAYS = 60; // chỉ coi là "mới" khi đăng trong chừng này ngày; đề cũ hơn thì không bày ra như thể mới

const DAY_MS = 86_400_000;

// "hôm nay", "hôm qua", "5 ngày trước", "3 tuần trước"
function ago(iso: string, now = Date.now()) {
  const days = Math.max(0, Math.floor((now - new Date(iso).getTime()) / DAY_MS));
  if (days === 0) return "hôm nay";
  if (days === 1) return "hôm qua";
  if (days < 14) return `${days} ngày trước`;
  return `${Math.floor(days / 7)} tuần trước`;
}

// Khối "Đề mới đăng": các đề vừa được đăng gần đây, lấy từ danh mục thật. Người học sắp thi sẽ muốn biết đề kỳ này đã có chưa,
// nên đây là lý do để mở web ngay thay vì để sau. Không có đề đăng trong FRESH_DAYS ngày gần đây thì ẩn hẳn (không dựng số liệu).
export function LatestExamsStrip() {
  const { data } = useApi(() => catalogApi.latest(), []);
  const now = Date.now();
  const fresh = (data ?? []).filter((e) => now - new Date(e.postedAt).getTime() <= FRESH_DAYS * DAY_MS);
  if (fresh.length === 0) return null;

  return (
    <section aria-label="Đề mới đăng gần đây" className="mt-8">
      <p className="md-label-large mb-2.5 flex items-center justify-center gap-1.5 text-on-surface-variant">
        <Flame size={16} className="text-[#e89a00]" aria-hidden /> Mới đăng gần đây
      </p>
      <ul className="flex flex-wrap justify-center gap-2">
        {fresh.map((e) => (
          <li key={e.threadId}>
            <Link
              to={`/?subject=${encodeURIComponent(e.subjectCode)}`}
              className="md-state inline-flex items-center gap-2 rounded-full border border-outline-variant/70 bg-gradient-to-b from-surface-container-lowest to-surface-container-low px-3.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_8px_18px_-12px_rgba(70,45,0,0.35)] transition hover:-translate-y-0.5 hover:border-[#e0a100]/70"
            >
              <span className="md-label-large text-on-surface">{e.title}</span>
              <span className="md-label-medium rounded-full bg-primary-container/70 px-2 py-0.5 text-on-primary-container">{ago(e.postedAt, now)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

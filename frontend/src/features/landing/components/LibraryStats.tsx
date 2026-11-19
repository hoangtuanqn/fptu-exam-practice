import { catalogApi } from "@/features/exam-store/catalog.api";
import { useApi } from "@/shared/hooks/useApi";
import { useCountUp } from "@/shared/hooks/useCountUp";
import { formatCredit } from "@/shared/utils/formatters";
import { useSignupGift } from "../useSignupGift";

const SM_COLS = ["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3", "sm:grid-cols-4", "sm:grid-cols-5"];

interface Stat {
  label: string;
  value: number | undefined;
  wideOnly?: boolean; // ô phụ: chỉ hiện khi đủ chỗ (từ sm)
}

// Dải số liệu kho đề ở đầu trang chủ: số thật đếm từ danh mục, không làm tròn lên, không "200+".
// Đang tải hoặc lỗi thì ẩn hẳn; mục nào máy chủ chưa trả (byKind ở bản cũ) hoặc bằng 0 thì bỏ.
export function LibraryStats() {
  const data = useApi(() => catalogApi.overview(), []).data;
  const { price, priceKnown } = useSignupGift();
  if (!data) return null;

  const all: Stat[] = [
    { label: "Đề FE", value: data.byKind?.FE },
    { label: "Đề PE", value: data.byKind?.PE },
    { label: "Môn học", value: data.subjects },
    { label: "Đề mở được ngay", value: data.examsReady },
    { label: "Đề Quiz", value: data.byKind?.QUIZ, wideOnly: true },
  ];
  const stats = all.filter((s): s is Stat & { value: number } => typeof s.value === "number" && s.value > 0);
  if (stats.length === 0) return null;

  return (
    <div className="mx-auto mt-6 max-w-2xl">
      <dl className={`grid grid-cols-2 gap-2 ${SM_COLS[stats.length]}`}>
        {stats.map((s) => (
          <StatTile key={s.label} label={s.label} value={s.value} wideOnly={s.wideOnly} />
        ))}
      </dl>
      {priceKnown && (
        <p className="md-body-medium mt-3 text-on-surface-variant">
          Mở đề 1 click · <b className="font-semibold text-primary">{price > 0 ? `${formatCredit(price)} / đề` : "miễn phí"}</b>
        </p>
      )}
    </div>
  );
}

function StatTile({ label, value, wideOnly }: { label: string; value: number; wideOnly?: boolean }) {
  const shown = useCountUp(value);
  return (
    <div className={`flex-col-reverse rounded-m3-md border border-outline-variant bg-surface-container-lowest/80 px-3 py-2.5 shadow-m3-1 ${wideOnly ? "hidden sm:flex" : "flex"}`}>
      <dt className="md-label-medium text-on-surface-variant">{label}</dt>
      <dd className="md-headline-small font-bold tabular-nums text-on-surface">
        {/* Số chạy chỉ để nhìn; trình đọc màn hình đọc số cuối */}
        <span aria-hidden>{shown.toLocaleString("vi-VN")}</span>
        <span className="sr-only">{value.toLocaleString("vi-VN")}</span>
      </dd>
    </div>
  );
}

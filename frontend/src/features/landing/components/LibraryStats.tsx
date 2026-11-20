import { BookOpen, FileText, ListChecks, Terminal, type LucideIcon } from "lucide-react";
import { catalogApi } from "@/features/exam-store/catalog.api";
import { useApi } from "@/shared/hooks/useApi";
import { useCountUp } from "@/shared/hooks/useCountUp";

// Số cột theo số ô: trên điện thoại ô phụ (Quiz) bị ẩn nên tính riêng, để không bị lẻ một ô
const PHONE_COLS = ["", "grid-cols-1", "grid-cols-2", "grid-cols-3"];
const SM_COLS = ["", "sm:grid-cols-1", "sm:grid-cols-2", "sm:grid-cols-3", "sm:grid-cols-4"];

interface Stat {
  label: string;
  icon: LucideIcon;
  value: number | undefined;
  wideOnly?: boolean; // ô phụ: chỉ hiện khi đủ chỗ (từ sm)
  always?: boolean; // ô chính: có số liệu từ máy chủ thì luôn hiện, kể cả khi số là 0 (số thật, không giấu)
}

// Dải số liệu kho đề ở đầu trang chủ: số thật đếm từ danh mục, không làm tròn lên, không "200+".
// Đang tải hoặc lỗi thì ẩn hẳn; mục nào máy chủ chưa trả (byKind ở bản cũ) thì bỏ. FE và PE luôn hiện khi có số liệu, các ô phụ bằng 0 thì bỏ.
export function LibraryStats() {
  const { data, loading } = useApi(() => catalogApi.overview(), []);
  // Đang tải thì giữ chỗ đúng chiều cao dải số liệu, để khi số về không làm nhảy bố cục; lỗi thì ẩn hẳn
  if (!data) return loading ? <div aria-hidden className="mx-auto mt-5 h-[7.5rem] max-w-md sm:h-[8.5rem] sm:max-w-lg" /> : null;

  const all: Stat[] = [
    { label: "Đề thi FE", icon: FileText, value: data.byKind?.FE, always: true },
    { label: "Đề thi PE", icon: Terminal, value: data.byKind?.PE, always: true },
    { label: "Môn học", icon: BookOpen, value: data.subjects },
    { label: "Đề Quiz", icon: ListChecks, value: data.byKind?.QUIZ, wideOnly: true },
  ];
  const stats = all.filter((s): s is Stat & { value: number } => typeof s.value === "number" && (s.always || s.value > 0));
  if (stats.length === 0) return null;
  const onPhone = Math.min(3, stats.filter((s) => !s.wideOnly).length);

  return (
    <div className="mx-auto mt-5 max-w-md sm:max-w-lg">
      <dl className={`grid gap-2 sm:gap-2.5 ${PHONE_COLS[onPhone]} ${SM_COLS[Math.min(4, stats.length)]}`}>
        {stats.map((s, i) => (
          <StatTile key={s.label} stat={s} index={i} />
        ))}
      </dl>
    </div>
  );
}

// Một ô số liệu: vạch vàng trên đầu, biểu tượng trong vòng tròn, số chữ vàng đồng, nhãn nhỏ. Hiện lần lượt từng ô,
// có ánh quét một lần và nhấc nhẹ khi rê chuột (các hiệu ứng tự tắt khi người dùng bật giảm chuyển động).
function StatTile({ stat, index }: { stat: Stat & { value: number }; index: number }) {
  const { icon: Icon, label, value, wideOnly } = stat;
  const shown = useCountUp(value);
  return (
    <div
      style={{ animationDelay: `${index * 90}ms` }}
      className={`stat-tile group relative animate-fade-up flex-col items-center overflow-hidden rounded-m3-md border border-outline-variant/70 bg-gradient-to-b from-surface-container-lowest to-surface-container-low px-2 pb-2.5 pt-3 text-center shadow-[0_1px_2px_rgba(0,0,0,0.05),0_14px_28px_-18px_rgba(70,45,0,0.45)] transition duration-300 hover:border-[#e0a100]/70 hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_20px_36px_-16px_rgba(232,154,0,0.55)] motion-safe:hover:-translate-y-1 ${wideOnly ? "hidden sm:flex" : "flex"}`}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#ffd75e] via-[#ffc61f] to-[#e89a00]" />
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-container/70 text-primary transition duration-300 motion-safe:group-hover:scale-110 motion-safe:group-hover:-rotate-6">
        <Icon size={15} aria-hidden />
      </span>
      {/* dt phải đứng trước dd trong HTML (dl chỉ nhận nhóm dt rồi dd); thứ tự hiển thị vẫn do class order */}
      <dt className="md-label-small order-3 mt-1 text-on-surface-variant">{label}</dt>
      <dd className="order-2 mt-1.5 font-display text-2xl font-semibold leading-none tabular-nums sm:text-3xl">
        {/* Số chạy chỉ để nhìn; trình đọc màn hình đọc số cuối */}
        <span aria-hidden className="bg-gradient-to-b from-[#e89a00] to-[#8a6200] bg-clip-text text-transparent">
          {shown.toLocaleString("vi-VN")}
        </span>
        <span className="sr-only">{value.toLocaleString("vi-VN")}</span>
      </dd>
    </div>
  );
}

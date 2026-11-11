import { CalendarClock, Crown } from "lucide-react";
import { formatDate } from "@/shared/utils/formatters";

interface Props {
  pro: boolean;
  daysLeft: number;
  expiresAt: string | null;
}

// Đầu trang: một ý chính, một câu giải thích; người đang là Pro thấy thêm hạn hiện tại
export function ProHero({ pro, daysLeft, expiresAt }: Props) {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-10 text-center sm:pt-14">
      <span className="md-label-large inline-flex items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 text-on-primary-container">
        <Crown size={14} /> Gói Pro
      </span>
      <h1 className="mt-4 text-3xl font-semibold leading-tight text-on-surface sm:text-4xl">Học thả ga, không lo bị trừ credit</h1>
      <p className="md-body-large mx-auto mt-3 max-w-xl text-on-surface-variant">
        Lấy đề, xem giải thích AI và tải đề PE không bị tính phí trong suốt thời hạn Pro. Trả một lần, không tự gia hạn.
      </p>
      {pro && (
        <p className="md-body-medium mx-auto mt-5 inline-flex max-w-md items-center gap-2 rounded-m3-md bg-surface-container px-3.5 py-2.5 text-on-surface">
          <CalendarClock size={18} className="shrink-0 text-primary" />
          <span>
            Bạn đang là Pro, còn <b>{daysLeft} ngày</b>
            {expiresAt ? ` (đến ${formatDate(expiresAt)})` : ""}. Mua thêm sẽ được cộng dồn.
          </span>
        </p>
      )}
    </section>
  );
}

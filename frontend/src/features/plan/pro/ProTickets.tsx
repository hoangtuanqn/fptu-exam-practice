import { Ticket } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { formatDate } from "@/shared/utils/formatters";
import type { ProTicket } from "../plan.api";

// Vé Pro đã mua mà chưa kích hoạt, ở đầu trang Gói Pro: mỗi vé một dòng kèm hạn phải kích hoạt và nút Kích hoạt
export function ProTickets({ tickets, onActivate }: { tickets: ProTicket[]; onActivate: (ticket: ProTicket) => void }) {
  if (tickets.length === 0) return null;
  return (
    <section aria-label="Vé Pro của bạn" className="relative z-10 mx-auto -mt-16 max-w-3xl px-4 pb-24 expanded:pb-28">
      <div className="rounded-m3-xl border border-[#e0a100]/50 bg-surface-container-lowest p-4 shadow-m3-2 sm:p-5">
        <h2 className="md-title-medium flex items-center gap-2 text-on-surface">
          <Ticket size={18} className="text-[#b87d00]" aria-hidden /> Vé Pro của bạn
        </h2>
        <p className="md-body-small mt-0.5 text-on-surface-variant">Thời hạn Pro chỉ bắt đầu chạy khi bạn bấm Kích hoạt.</p>
        <ul className="mt-3 divide-y divide-outline-variant/60">
          {tickets.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div>
                <div className="md-title-small text-on-surface">
                  {t.name} · {t.duration}
                </div>
                <div className="md-body-small text-on-surface-variant">Cần kích hoạt trước ngày {formatDate(t.expiresAt)}</div>
              </div>
              <Button size="sm" variant="primary" onClick={() => onActivate(t)}>
                Kích hoạt
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

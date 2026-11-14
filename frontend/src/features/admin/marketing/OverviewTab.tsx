import { useState } from "react";
import { Check, Loader2, Mail, Pause, Play, X } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { marketingAdminApi, type Campaign, type FunnelRow, type MarketingOverview } from "./marketing.api";

const nf = new Intl.NumberFormat("vi-VN");
const pf = new Intl.NumberFormat("vi-VN", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });
const timeVN = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

const formatRun = (iso: string | undefined) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? timeVN.format(d) : "—";
};

interface OverviewQuery {
  data: MarketingOverview | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function Step({ label, value, sent }: { label: string; value: number; sent?: number }) {
  return (
    <span className="whitespace-nowrap">
      {label} <b className="tabular-nums text-on-surface">{nf.format(value)}</b>
      {sent ? <span className="tabular-nums"> ({pf.format(value / sent)})</span> : null}
    </span>
  );
}

function FunnelLine({ c, row }: { c: Campaign; row: FunnelRow | undefined }) {
  const r = { sent: 0, clicked: 0, bought: 0, returned: 0, pending: 0, ...row };
  return (
    <Card>
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="md-title-medium text-on-surface">{c.label}</h3>
          <Badge tone={c.enabled ? "success" : "neutral"}>{c.enabled ? "Đang bật" : "Đang tắt"}</Badge>
        </div>
        {r.sent === 0 ? (
          <p className="md-body-medium text-on-surface-variant">Chưa có dữ liệu</p>
        ) : (
          <p className="md-body-medium flex flex-wrap items-center gap-x-2 gap-y-1 text-on-surface-variant">
            <Step label="Gửi" value={r.sent} />
            <span aria-hidden>→</span>
            <Step label="Bấm" value={r.clicked} sent={r.sent} />
            {c.key === "winback" && (
              <>
                <span aria-hidden>→</span>
                <Step label="Quay lại sau thư" value={r.returned} sent={r.sent} />
              </>
            )}
            <span aria-hidden>→</span>
            <Step label="Mua Pro sau thư" value={r.bought} sent={r.sent} />
          </p>
        )}
        {r.pending > 0 && (
          <p className="md-body-small text-on-surface-variant">
            Đang chờ kết quả: <b className="tabular-nums">{nf.format(r.pending)}</b> (thư gửi trong 7 ngày gần nhất, chưa đủ thời gian ghi nhận)
          </p>
        )}
      </div>
    </Card>
  );
}

export function OverviewTab({ overview, campaigns }: { overview: OverviewQuery; campaigns: Campaign[] | null }) {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const [busy, setBusy] = useState(false);

  const setPaused = async (paused: boolean) => {
    if (paused) {
      const ok = await confirm({
        title: "Tạm dừng tất cả thư marketing?",
        message: "Không thư tự động nào được gửi cho tới khi bấm Tiếp tục gửi. Trạng thái bật/tắt của từng chiến dịch vẫn giữ nguyên.",
        confirmLabel: "Tạm dừng",
        icon: Pause,
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      await marketingAdminApi.setPaused(paused);
      toast.success(paused ? "Đã tạm dừng gửi thư" : "Đã tiếp tục gửi thư");
      overview.reload();
    } catch (err) {
      toast.error(errorMessage(err, "Không đổi được trạng thái"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <QueryBoundary query={overview}>
        {({ status: s, funnel }) => (
          <div className="space-y-4">
            {s.paused && (
              <div role="status" className="md-body-medium flex items-start gap-3 rounded-m3-md border border-warning bg-warning-container px-4 py-3 text-on-warning-container">
                <Pause size={20} className="mt-0.5 shrink-0" />
                Đang tạm dừng: không thư marketing nào được gửi cho tới khi bấm Tiếp tục gửi.
              </div>
            )}
            <Card>
              <div className="md-body-medium flex flex-wrap items-center gap-x-4 gap-y-2 p-4 text-on-surface-variant">
                <span className="whitespace-nowrap">
                  Hôm nay <b className="tabular-nums text-on-surface">{nf.format(s.sentToday)}/{nf.format(s.dailyCap)}</b>
                </span>
                <span className="whitespace-nowrap">
                  Lượt kế tiếp <b className="tabular-nums text-on-surface">{formatRun(s.nextRun)}</b>
                </span>
                <span className="whitespace-nowrap">
                  Huỷ nhận <b className="tabular-nums text-on-surface">{pf.format(s.optOutRate || 0)}</b>
                </span>
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  SMTP
                  {s.smtpConfigured ? <Check size={16} className="text-success" aria-hidden /> : <X size={16} className="text-error" aria-hidden />}
                  <span className="sr-only">{s.smtpConfigured ? "đã cấu hình" : "chưa cấu hình"}</span>
                </span>
                <Button size="sm" className="sm:ml-auto" disabled={busy} onClick={() => void setPaused(!s.paused)}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : s.paused ? <Play size={16} /> : <Pause size={16} />}
                  {s.paused ? "Tiếp tục gửi" : "Tạm dừng tất cả"}
                </Button>
              </div>
            </Card>
            <div>
              <h2 className="md-title-small mb-1 text-on-surface">30 ngày qua</h2>
              <p className="md-body-small mb-3 text-on-surface-variant">Phần trăm tính trên số thư đã gửi. Mua Pro hoặc quay lại sau thư: trong 7 ngày sau khi nhận thư.</p>
              {!campaigns ? null : campaigns.length === 0 ? (
                <Card>
                  <Empty icon={Mail} title="Chưa có chiến dịch nào" />
                </Card>
              ) : (
                <div className="grid gap-3">
                  {campaigns.map((c) => (
                    <FunnelLine key={c.key} c={c} row={funnel?.[c.key]} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </QueryBoundary>
      {confirmDialog}
    </>
  );
}

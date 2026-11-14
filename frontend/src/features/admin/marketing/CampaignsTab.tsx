import { useCallback, useState } from "react";
import { Eye, Loader2, Mail, Send, SlidersHorizontal } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Switch } from "@/shared/ui/Switch";
import { marketingAdminApi, type Campaign, type CampaignKey } from "./marketing.api";
import { ParamsDialog } from "./ParamsDialog";
import { PreviewDialog } from "./PreviewDialog";

const nf = new Intl.NumberFormat("vi-VN");

interface CampaignsQuery {
  data: Campaign[] | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Câu nói số người đủ điều kiện và số ngày ước tính để gửi hết; bỏ phần nào chưa có số (backend cũ)
function reachText(eligible: number | undefined, dailyCap: number | undefined) {
  if (eligible === undefined) return "";
  if (eligible === 0) return "Hiện chưa có ai đủ điều kiện. ";
  const days = dailyCap && dailyCap > 0 ? `, khoảng ${nf.format(Math.ceil(eligible / dailyCap))} ngày để gửi hết` : "";
  return `Hiện có ${nf.format(eligible)} người đủ điều kiện${days}. `;
}

export function CampaignsTab({ campaigns, dailyCap, onParamsSaved }: { campaigns: CampaignsQuery; dailyCap: number | undefined; onParamsSaved: () => void }) {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const eligible = useApi(() => marketingAdminApi.eligibleCount(), []);
  const [busy, setBusy] = useState<CampaignKey | null>(null);
  const [dialog, setDialog] = useState<"params" | Campaign | null>(null);
  const closeDialog = useCallback(() => setDialog(null), []); // ổn định để Modal không chạy lại effect focus mỗi lần render

  const toggle = async (c: Campaign, on: boolean) => {
    if (on) {
      const ok = await confirm({
        title: `Bật chiến dịch "${c.label}"?`,
        message: `${reachText(eligible.data?.[c.key], dailyCap)}Chiến dịch sẽ bắt đầu gửi thư cho người dùng thật ở lượt gửi 10:00 tới. Hãy gửi thử cho mình trước nếu chưa xem mẫu.`,
        confirmLabel: "Bật chiến dịch",
        icon: Mail,
      });
      if (!ok) return;
    }
    setBusy(c.key);
    try {
      await marketingAdminApi.setEnabled(c.key, on);
      toast.success(on ? `Đã bật "${c.label}"` : `Đã tắt "${c.label}"`);
      campaigns.reload();
    } catch (err) {
      toast.error(errorMessage(err, "Không đổi được trạng thái"));
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async (c: Campaign) => {
    setBusy(c.key);
    try {
      const r = await marketingAdminApi.sendTest(c.key);
      toast.success(`Đã gửi ${r.sent} thư mẫu tới ${r.to}`);
    } catch (err) {
      toast.error(errorMessage(err, "Không gửi được thư mẫu"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setDialog("params")}>
          <SlidersHorizontal size={16} />
          Chỉnh thông số
        </Button>
      </div>
      <QueryBoundary query={campaigns}>
        {(list) =>
          list.length === 0 ? (
            <Card>
              <Empty icon={Mail} title="Chưa có chiến dịch nào" />
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {list.map((c) => (
                <Card key={c.key}>
                  <CardHeader title={c.label} description={c.description} action={<Switch label={`Bật chiến dịch ${c.label}`} checked={c.enabled} disabled={busy === c.key} onChange={(v) => void toggle(c, v)} />} />
                  <div className="space-y-4 p-5">
                    <p className="md-body-medium text-on-surface">
                      Đang đủ điều kiện: <b className="tabular-nums">{eligible.data?.[c.key] !== undefined ? nf.format(eligible.data[c.key] ?? 0) : "—"}</b>
                    </p>
                    <ul className="md-body-medium flex flex-wrap gap-x-5 gap-y-1 text-on-surface-variant">
                      {c.steps.map((s) => (
                        <li key={s.step}>
                          Thư {s.step}: <b className="tabular-nums text-on-surface">{nf.format(s.sentCount)}</b> đã gửi
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => setDialog(c)}>
                        <Eye size={16} />
                        Xem thư
                      </Button>
                      <Button size="sm" disabled={busy === c.key} onClick={() => void sendTest(c)}>
                        {busy === c.key ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Gửi thử cho tôi
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        }
      </QueryBoundary>
      {dialog === "params" && <ParamsDialog onClose={closeDialog} onSaved={onParamsSaved} />}
      {dialog && dialog !== "params" && <PreviewDialog campaign={dialog} onClose={closeDialog} />}
      {confirmDialog}
    </>
  );
}

import { CheckCircle2, Loader2, Play, XCircle } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { formatDateTime } from "@/shared/utils/formatters";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";

// Trạng thái lần đối soát gần nhất + nút "Chạy ngay"
import { useConfirm } from "@/shared/ui/ConfirmDialog";
export function SyncCard() {
  const toast = useToast();
  const status = useApi(() => adminApi.sepayStatus(), []);
  const { run, loading } = useSubmit();
  const { confirm, confirmDialog } = useConfirm();

  const syncNow = async () => {
    if (!(await confirm({ title: "Chạy đối soát SePay ngay?", message: "Lấy giao dịch mới từ SePay và cộng credit cho các lệnh nạp khớp mã, giống như lần chạy tự động của cron.", confirmLabel: "Chạy ngay" }))) return;
    void run(async () => {
      const r = await adminApi.syncNow();
      r.ok ? toast.success(`Đối soát xong: ${r.created} giao dịch mới, ${r.matched} khớp lệnh`) : toast.error(r.message);
      status.reload();
    });
  };

  const last = status.data;
  return (
    <Card>
      {confirmDialog}
      <CardHeader
        title="Đối soát tự động"
        description="Cron lấy giao dịch từ SePay và cộng tiền cho lệnh khớp mã nạp."
        action={
          <Button onClick={syncNow} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Chạy ngay
          </Button>
        }
      />
      <div className="p-5 text-sm">
        {status.loading && !status.data ? (
          <span className="text-slate-500">Đang tải…</span>
        ) : last ? (
          <div className="flex items-start gap-3">
            {last.ok ? <CheckCircle2 size={18} className="mt-0.5 text-emerald-600" /> : <XCircle size={18} className="mt-0.5 text-rose-600" />}
            <div>
              <div className="font-medium text-slate-800">{last.ok ? "Lần chạy gần nhất thành công" : "Lần chạy gần nhất lỗi"}</div>
              <div className="text-slate-500">{formatDateTime(last.at)} · {last.message}</div>
              {last.ok && <div className="text-slate-500">Lấy {last.fetched} · mới {last.created} · khớp lệnh {last.matched}</div>}
            </div>
          </div>
        ) : (
          <span className="text-slate-500">Chưa có lần chạy nào.</span>
        )}
      </div>
    </Card>
  );
}

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { adminApi, type SeasonSettings } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { ErrorBox, FormError, Loading } from "@/shared/ui/Feedback";
import { Switch } from "@/shared/ui/Switch";
import { XMAS_END } from "@/shared/season/season";

function SeasonForm({ initial, onSaved }: { initial: SeasonSettings; onSaved: () => void }) {
  const toast = useToast();
  const { run, loading, error } = useSubmit();
  const [xmas, setXmas] = useState(initial.xmasEnabled === true);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await adminApi.saveSeasonSettings({ xmasEnabled: xmas });
      toast.success("Đã lưu giao diện mùa");
      onSaved();
    });
  };

  return (
    <Card>
      <CardHeader title="Giáng sinh" description={`Cóc Pass đội nón Noel, tuyết rơi nhẹ và logo Giáng sinh trên toàn website. Tự tắt từ ngày ${XMAS_END.toLocaleDateString("vi-VN")}.`} />
      <form onSubmit={onSubmit} className="space-y-5 p-5" noValidate>
        <FormError message={error} />
        <div className="panel-setting-row">
          <div>
            <div className="text-sm font-medium text-on-surface">Bật giao diện Giáng sinh</div>
            <div className="text-xs text-on-surface-variant">
              Tắt thì toàn bộ website trở về giao diện thường cho mọi người. Thay đổi có hiệu lực trong khoảng một phút, người đang mở trang sẽ thấy khi tải lại.
            </div>
          </div>
          <Switch checked={xmas} onChange={setXmas} label="Bật giao diện Giáng sinh" />
        </div>
        <Button variant="primary" type="submit" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Lưu
        </Button>
      </form>
    </Card>
  );
}

// Giao diện theo mùa của website (hiện có: Giáng sinh)
export default function SeasonPage() {
  const settings = useApi(() => adminApi.seasonSettings(), []);
  return (
    <>
      <PageHeader title="Giao diện mùa" description="Bật hoặc tắt giao diện theo dịp lễ cho toàn website." />
      {settings.data ? (
        <SeasonForm key={JSON.stringify(settings.data)} initial={settings.data} onSaved={settings.reload} />
      ) : settings.loading ? (
        <Loading />
      ) : (
        <ErrorBox message={settings.error ?? "Không tải được cấu hình"} onRetry={settings.reload} />
      )}
    </>
  );
}

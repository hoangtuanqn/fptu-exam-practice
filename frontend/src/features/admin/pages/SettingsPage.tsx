import { useState } from "react";
import { adminApi } from "@/features/admin/api/admin.api";
import { SepayConfigForm } from "@/features/admin/components/SepayConfigForm";
import { SyncCard } from "@/features/admin/components/SyncCard";
import { useApi } from "@/shared/hooks/useApi";
import { PageHeader } from "@/shared/ui/Card";
import { ErrorBox, Loading } from "@/shared/ui/Feedback";

export default function SettingsPage() {
  const config = useApi(() => adminApi.sepayConfig(), []);
  const [syncKey, setSyncKey] = useState(0); // đổi key để SyncCard tải lại trạng thái

  return (
    <>
      <PageHeader title="Cấu hình SePay" description="Thiết lập nhận tiền và lịch đối soát tự động." />
      {config.loading && !config.data ? (
        <Loading />
      ) : config.error || !config.data ? (
        <ErrorBox message={config.error ?? "Không tải được cấu hình"} onRetry={config.reload} />
      ) : (
        <div className="space-y-6">
          <SepayConfigForm
            key={config.data.apiTokenPreview}
            initial={config.data}
            onSaved={() => {
              config.reload();
              setSyncKey((k) => k + 1);
            }}
          />
          <SyncCard key={syncKey} />
        </div>
      )}
    </>
  );
}

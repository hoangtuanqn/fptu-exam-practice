import { AiConfigForm } from "@/features/admin/content/AiConfigForm";
import { adminApi } from "@/features/admin/api/admin.api";
import { useApi } from "@/shared/hooks/useApi";
import { PageHeader } from "@/shared/ui/Card";
import { ErrorBox, Loading } from "@/shared/ui/Feedback";

// AI giải đáp án: khóa Claude, model, mức suy luận. Chạy lại cho từng đề ở trang Đề thi.
export default function AiPage() {
  const ai = useApi(() => adminApi.aiConfig(), []);

  return (
    <>
      <PageHeader title="AI giải đáp án" description="Claude giải đáp án cho đề mới lấy về. Giải lại từng đề ở mục Đề thi." />
      {ai.loading && !ai.data ? (
        <Loading />
      ) : ai.error || !ai.data ? (
        <ErrorBox message={ai.error ?? "Không tải được cấu hình AI"} onRetry={ai.reload} />
      ) : (
        <AiConfigForm key={ai.data.apiKeyPreview} initial={ai.data} onSaved={ai.reload} />
      )}
    </>
  );
}

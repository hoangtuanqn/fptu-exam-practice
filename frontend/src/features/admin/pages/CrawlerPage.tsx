import { AiConfigForm } from "@/features/admin/components/AiConfigForm";
import { CrawlerConfigForm } from "@/features/admin/components/CrawlerConfigForm";
import { adminApi } from "@/features/admin/api/admin.api";
import { useApi } from "@/shared/hooks/useApi";
import { PageHeader } from "@/shared/ui/Card";
import { ErrorBox, Loading } from "@/shared/ui/Feedback";

export default function CrawlerPage() {
  const config = useApi(() => adminApi.crawlerConfig(), []);
  const ai = useApi(() => adminApi.aiConfig(), []);

  return (
    <>
      <PageHeader title="Cấu hình crawl" description="Đăng nhập FuOverflow để lấy đề từ link, và AI giải đáp án cho đề mới." />
      {config.loading && !config.data ? (
        <Loading />
      ) : config.error || !config.data ? (
        <ErrorBox message={config.error ?? "Không tải được cấu hình"} onRetry={config.reload} />
      ) : (
        <div className="space-y-6">
          <CrawlerConfigForm key={config.data.cookiePreview} initial={config.data} onSaved={config.reload} />
          {ai.data ? <AiConfigForm key={ai.data.apiKeyPreview} initial={ai.data} onSaved={ai.reload} /> : ai.loading ? <Loading /> : <ErrorBox message={ai.error ?? "Không tải được cấu hình AI"} onRetry={ai.reload} />}
        </div>
      )}
    </>
  );
}

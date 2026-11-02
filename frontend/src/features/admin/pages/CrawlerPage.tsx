import { CrawlerConfigForm } from "@/features/admin/components/CrawlerConfigForm";
import { adminApi } from "@/features/admin/api/admin.api";
import { useApi } from "@/shared/hooks/useApi";
import { PageHeader } from "@/shared/ui/Card";
import { ErrorBox, Loading } from "@/shared/ui/Feedback";

export default function CrawlerPage() {
  const config = useApi(() => adminApi.crawlerConfig(), []);

  return (
    <>
      <PageHeader title="Cấu hình crawl" description="Thông tin đăng nhập FuOverflow để hệ thống tự lấy đề từ link." />
      {config.loading && !config.data ? (
        <Loading />
      ) : config.error || !config.data ? (
        <ErrorBox message={config.error ?? "Không tải được cấu hình"} onRetry={config.reload} />
      ) : (
        <CrawlerConfigForm key={config.data.cookiePreview} initial={config.data} onSaved={config.reload} />
      )}
    </>
  );
}

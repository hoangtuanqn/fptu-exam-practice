import { CrawlerConfigForm } from "@/features/admin/content/CrawlerConfigForm";
import { adminApi } from "@/features/admin/api/admin.api";
import { useApi } from "@/shared/hooks/useApi";
import { PageHeader } from "@/shared/ui/Card";
import { ErrorBox, Loading } from "@/shared/ui/Feedback";

// Lấy đề từ FuOverflow: cookie đăng nhập, tốc độ tải, chất lượng ảnh và phí mỗi lần lấy
export default function CrawlerPage() {
  const config = useApi(() => adminApi.crawlerConfig(), []);

  return (
    <>
      <PageHeader title="Cấu hình lấy đề" description="Đăng nhập FuOverflow, tốc độ tải ảnh và phí mỗi lần lấy đề." />
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

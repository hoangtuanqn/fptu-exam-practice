import { ImageUp } from "lucide-react";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Pagination } from "@/shared/ui/Table";
import { formatDateTime } from "@/shared/utils/formatters";
import { useApi } from "@/shared/hooks/useApi";
import { ContributionStatusBadge } from "./ContributionStatusBadge";
import { contributionApi } from "./exam-contribution.api";

// Các lần gửi đề của bạn và kết quả duyệt. `version` đổi khi vừa gửi xong để tải lại danh sách.
export function MyContributions({ version }: { version: number }) {
  const [url, setUrl] = useUrlState({ page: "1" });
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const { data, error, loading, reload } = useApi(() => contributionApi.mine(page), [page, version]);
  useClampPage(data?.meta, setPage);

  return (
    <Card>
      <CardHeader title="Đóng góp của tôi" />
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : data && data.items.length > 0 ? (
        <div className={loading ? "opacity-60 transition" : "transition"}>
          <ul className="divide-y divide-outline-variant">
            {data.items.map((c) => (
              <li key={c.id} className="space-y-1 px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="md-title-small min-w-0 truncate text-on-surface">
                    {c.subjectCode}
                    {c.title ? ` · ${c.title}` : ""}
                  </span>
                  <ContributionStatusBadge value={c.status} />
                </div>
                <div className="md-body-small text-on-surface-variant">
                  {c.imageCount} ảnh{c.term ? ` · ${c.term}` : ""} · {formatDateTime(c.createdAt)}
                </div>
                {c.reviewNote && <div className="md-body-small text-on-surface-variant">Ghi chú của admin: {c.reviewNote}</div>}
              </li>
            ))}
          </ul>
          <Pagination meta={data.meta} onPage={setPage} />
        </div>
      ) : (
        <Empty icon={ImageUp} title="Bạn chưa gửi đề nào">
          Gửi ảnh đề ở trên, đề sẽ hiện ở đây kèm trạng thái duyệt.
        </Empty>
      )}
    </Card>
  );
}

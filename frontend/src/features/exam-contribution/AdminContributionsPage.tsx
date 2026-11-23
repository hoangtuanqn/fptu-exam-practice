import { useState } from "react";
import { ImageUp, SearchCheck } from "lucide-react";
import { refreshReviewCounts } from "@/features/admin/review-counts.store";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Button } from "@/shared/ui/Button";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatDateTime } from "@/shared/utils/formatters";
import { ContributionReviewDialog } from "./ContributionReviewDialog";
import { ContributionStatusBadge } from "./ContributionStatusBadge";
import { contributionApi, type AdminContribution, type ContributionStatus } from "./exam-contribution.api";

type Filter = ContributionStatus | "";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "REJECTED", label: "Bị từ chối" },
  { value: "", label: "Tất cả" },
];

// Đề thành viên đóng góp: mặc định hiện đề chờ duyệt
export default function AdminContributionsPage() {
  const [url, setUrl] = useUrlState({ status: "PENDING", page: "1" });
  const status = (FILTERS.some((f) => f.value === url.status) ? url.status : "PENDING") as Filter;
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const { data, error, loading, reload } = useApi(() => contributionApi.list(page, status), [page, status]);
  useClampPage(data?.meta, setPage);
  const [selected, setSelected] = useState<AdminContribution | null>(null);
  const items = data?.items ?? [];

  const who = (c: AdminContribution) => c.user?.fullName ?? "Không rõ";
  const what = (c: AdminContribution) => `${c.subjectCode}${c.title ? ` · ${c.title}` : ""}`;
  const openButton = (c: AdminContribution) => (
    <Button
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        setSelected(c);
      }}
      aria-label={`Xem đề ${what(c)} của ${who(c)}`}
      className="shrink-0"
    >
      <SearchCheck size={16} aria-hidden /> {c.status === "PENDING" ? "Xem xét" : "Xem"}
    </Button>
  );

  return (
    <>
      <PageHeader title="Đề đóng góp" description="Ảnh đề thành viên gửi lên. Xem ảnh rồi duyệt hoặc từ chối; từ chối sẽ xoá ảnh." />
      <Card>
        <div className="border-b border-outline-variant p-4">
          <Segmented<Filter> label="Lọc theo trạng thái" value={status} onChange={(v) => setUrl({ status: v, page: "1" })} options={FILTERS} />
        </div>

        {loading && !data ? (
          <Loading shape="table" />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && items.length > 0 ? (
          <div className={loading ? "opacity-60 transition" : "transition"}>
            <ul className="divide-y divide-outline-variant md:hidden">
              {items.map((c) => (
                <li key={c.id} className="flex items-center gap-2 py-3 pl-4 pr-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="md-title-small truncate text-on-surface">{what(c)}</span>
                      <ContributionStatusBadge value={c.status} />
                    </div>
                    <div className="md-body-small text-on-surface-variant">
                      {c.imageCount} ảnh{c.term ? ` · ${c.term}` : ""} · {who(c)} · {formatDateTime(c.createdAt)}
                    </div>
                    {c.note && <div className="md-body-small line-clamp-2 text-on-surface-variant">{c.note}</div>}
                  </div>
                  {openButton(c)}
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <Thead>
                  <Th>Môn · tiêu đề</Th>
                  <Th>Kỳ</Th>
                  <Th className="text-right">Ảnh</Th>
                  <Th>Người gửi</Th>
                  <Th>Trạng thái</Th>
                  <Th>Gửi lúc</Th>
                  <Th>
                    <span className="sr-only">Thao tác</span>
                  </Th>
                </Thead>
                <tbody>
                  {items.map((c) => (
                    <Tr key={c.id} onClick={() => setSelected(c)}>
                      <Td>
                        <div className="font-medium text-on-surface">{what(c)}</div>
                        {c.note && <div className="line-clamp-2 max-w-xs text-xs text-on-surface-variant">{c.note}</div>}
                      </Td>
                      <Td>{c.term ?? "—"}</Td>
                      <Td className="text-right tabular-nums">{c.imageCount}</Td>
                      <Td>
                        <div className="text-on-surface">{who(c)}</div>
                        {c.user?.email && <div className="text-xs text-on-surface-variant">{c.user.email}</div>}
                      </Td>
                      <Td>
                        <ContributionStatusBadge value={c.status} />
                      </Td>
                      <Td className="whitespace-nowrap text-on-surface-variant">{formatDateTime(c.createdAt)}</Td>
                      <Td className="text-right">{openButton(c)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <Pagination meta={data.meta} onPage={setPage} />
          </div>
        ) : (
          <Empty icon={ImageUp} title={status === "PENDING" ? "Không có đề nào chờ duyệt" : "Không có đề nào"} />
        )}
      </Card>

      {selected && (
        <ContributionReviewDialog
          item={selected}
          onClose={() => setSelected(null)}
          onDone={() => {
            reload();
            void refreshReviewCounts();
          }}
        />
      )}
    </>
  );
}

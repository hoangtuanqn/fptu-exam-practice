import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Card, PageHeader } from "@/shared/ui/Card";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Segmented } from "@/shared/ui/Segmented";
import { fuoSourcesApi, type FuoSourceStatus } from "./fuo-sources.api";
import { PasteCard } from "./PasteCard";
import { RunCard } from "./RunCard";
import { SourcesList, STATUS } from "./SourcesList";
import { useFuoSourcesStatus } from "./useFuoSourcesStatus";

const FILTERS: FuoSourceStatus[] = ["NEW", "QUEUED", "RUNNING", "DONE", "FAILED"];

// Nguồn đề FuOverflow (chỉ admin): bấm một nút để quét FuOverflow, nhập đề mới và cập nhật đề đã đổi, chạy nền; dán link là tuỳ chọn
export default function FuoSourcesPage() {
  const [url, setUrl] = useUrlState({ status: "", page: "1" });
  const status = url.status as FuoSourceStatus | "";
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });

  const live = useFuoSourcesStatus();
  const run = live.status?.run;
  const counts = live.status?.counts;
  // Tải lại bảng khi một link vừa xong/lỗi, lượt đổi trạng thái hoặc có link mới được lưu
  const changed = `${run?.id}:${run?.status}:${(run?.done ?? 0) + (run?.failed ?? 0)}:${counts?.total}`;
  const list = useApi(() => fuoSourcesApi.list(page, status), [page, status, changed]);
  useClampPage(list.data?.meta, setPage);

  return (
    <>
      <PageHeader title="Nguồn đề" description="Bấm Load dữ liệu mới để tự tìm và tải đề mới, cập nhật đề đã đổi trên FuOverflow." />
      <div className="space-y-4">
        <QueryBoundary query={{ ...live.query, data: live.status }}>
          {(s) => <RunCard status={s} running={live.running} onStatus={live.set} />}
        </QueryBoundary>
        <PasteCard onSaved={live.refresh} />
        <Card>
          <div className="border-b border-outline-variant p-4">
            <Segmented
              label="Lọc theo trạng thái"
              value={status}
              onChange={(v: FuoSourceStatus | "") => setUrl({ status: v, page: "1" })}
              options={[
                { value: "", label: `Tất cả${counts ? ` (${counts.total})` : ""}` },
                ...FILTERS.map((f) => ({ value: f, label: `${STATUS[f][0]}${counts ? ` (${counts[f] ?? 0})` : ""}` })),
              ]}
            />
          </div>
          <QueryBoundary query={list}>{(data) => <SourcesList data={data} onPage={setPage} />}</QueryBoundary>
        </Card>
      </div>
    </>
  );
}

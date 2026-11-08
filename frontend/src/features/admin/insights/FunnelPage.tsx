import { useUrlState } from "@/shared/hooks/useUrlState";
import { useApi } from "@/shared/hooks/useApi";
import { Card, CardHeader, PageHeader, StatCard, StatGrid } from "@/shared/ui/Card";
import { ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Segmented } from "@/shared/ui/Segmented";
import { insightsApi } from "./insights.api";

const pct = (n: number, of: number) => (of > 0 ? `${Math.round((n / of) * 100)}%` : "—");

// Phễu người dùng: người đăng ký trong kỳ đã đi được tới đâu, và chỗ nào hay hỏng (lấy đề lỗi, nạp dở, làm bài bỏ dở)
export default function FunnelPage() {
  const [url, setUrl] = useUrlState({ days: "30" });
  const days = [7, 30, 90].includes(Number(url.days)) ? Number(url.days) : 30;
  const { data, error, loading, reload } = useApi(() => insightsApi.funnel(days), [days]);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Không có dữ liệu"} onRetry={reload} />;

  const base = data.steps[0]?.count ?? 0;
  const { crawl, deposits, practice } = data;
  const crawlTotal = crawl.done + crawl.failed;
  const depTotal = deposits.paid + deposits.pending + deposits.expired;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Phân tích"
        title="Phễu người dùng"
        description="Trong số người đăng ký ở kỳ đã chọn, bao nhiêu người đi tới từng bước. Chỗ tụt mạnh nhất là chỗ nên sửa trước."
        action={
          <Segmented
            label="Kỳ thống kê"
            value={String(days)}
            options={[{ value: "7", label: "7 ngày" }, { value: "30", label: "30 ngày" }, { value: "90", label: "90 ngày" }]}
            onChange={(v) => setUrl({ days: v })}
          />
        }
      />

      <Card>
        <CardHeader title="Từ đăng ký đến trả tiền" description={`Người đăng ký trong ${days} ngày gần đây (không tính quản trị viên)`} />
        <ol className="divide-y divide-outline-variant">
          {data.steps.map((s, i) => {
            const prev = i > 0 ? data.steps[i - 1]!.count : s.count;
            return (
              <li key={s.key} className="px-5 py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="md-title-small text-on-surface">{s.label}</span>
                  <span className="md-body-medium tabular-nums text-on-surface-variant">
                    <b className="text-on-surface">{s.count}</b> người · {pct(s.count, base)} số đăng ký
                    {i > 0 && <span className="ml-2 text-on-surface-variant">(giữ lại {pct(s.count, prev)} so với bước trước)</span>}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-container-highest" aria-hidden>
                  <div className="h-full rounded-full bg-primary" style={{ width: base > 0 ? `${Math.max(2, (s.count / base) * 100)}%` : "0%" }} />
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      <StatGrid className="grid-cols-1 sm:grid-cols-3">
        <StatCard tone="rose" label="Lấy đề lỗi" value={pct(crawl.failed, crawlTotal)} note={`${crawl.failed} lỗi / ${crawlTotal} lượt đã xong${crawl.running ? ` · ${crawl.running} đang chạy` : ""}`} />
        <StatCard tone="amber" label="Lệnh nạp không thành" value={pct(deposits.pending + deposits.expired, depTotal)} note={`${deposits.paid} đã trả · ${deposits.pending} chờ · ${deposits.expired} hết hạn`} />
        <StatCard tone="slate" label="Làm bài bỏ dở" value={pct(practice.abandoned, practice.started)} note={`${practice.abandoned} bỏ dở quá 1 ngày / ${practice.started} lượt bắt đầu`} />
      </StatGrid>

      <Card>
        <CardHeader title="Lỗi lấy đề hay gặp" description="Gom từ các lượt thất bại gần đây trong kỳ" />
        {crawl.topErrors.length === 0 ? (
          <p className="md-body-medium px-5 py-6 text-on-surface-variant">Không có lượt lấy đề nào thất bại trong kỳ này.</p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {crawl.topErrors.map((e) => (
              <li key={e.message} className="flex items-start justify-between gap-4 px-5 py-3">
                <span className="md-body-medium min-w-0 break-words text-on-surface">{e.message}</span>
                <span className="md-label-large shrink-0 tabular-nums text-on-surface-variant">{e.count} lần</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

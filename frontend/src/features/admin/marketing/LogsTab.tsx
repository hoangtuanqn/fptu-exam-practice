import { Check, ScrollText } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { useUrlSearch } from "@/shared/hooks/useUrlSearch";
import { Card } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Feedback";
import { Field, Select, inputClass } from "@/shared/ui/Input";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { marketingAdminApi, type Campaign, type MarketingLog } from "./marketing.api";

const timeVN = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });
const formatVN = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : timeVN.format(d);
};

// Tên dự phòng khi chưa tải được danh sách chiến dịch
const FALLBACK: Record<string, string> = { winback: "Gọi quay lại", pro_upsell: "Gợi ý Pro", pro_expiry: "Nhắc gia hạn" };

function Yes({ on, label }: { on: boolean; label: string }) {
  return on ? (
    <>
      <Check size={18} className="text-success" aria-hidden />
      <span className="sr-only">{label}</span>
    </>
  ) : (
    <span className="text-on-surface-variant" aria-hidden>
      –
    </span>
  );
}

export function LogsTab({ campaigns }: { campaigns: Campaign[] | null }) {
  const [url, setUrl] = useUrlState({ campaign: "", from: "", to: "", q: "", page: "1" });
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const [search, setSearch, q] = useUrlSearch(url.q, setUrl);
  const logs = useApi(
    () => marketingAdminApi.logs({ campaign: url.campaign, from: url.from, to: url.to, email: q, page }),
    [url.campaign, url.from, url.to, q, page],
  );
  useClampPage(logs.data?.meta, setPage);

  const names: Record<string, string> = { ...FALLBACK, ...Object.fromEntries((campaigns ?? []).map((c) => [c.key, c.label])) };
  const campaignText = (l: MarketingLog) => {
    const m = /^broadcast:(\d+)$/.exec(l.campaign);
    if (m) return `Thủ công #${m[1]}`;
    return `${names[l.campaign] ?? l.campaign} · thư ${l.step}`;
  };

  return (
    <Card>
      <div className="grid gap-3 border-b border-outline-variant p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Chiến dịch" value={url.campaign} onChange={(e) => setUrl({ campaign: e.target.value, page: "1" })}>
          <option value="">Tất cả</option>
          {Object.entries(names).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
          <option value="broadcast">Thủ công</option>
        </Select>
        <Field label="Từ ngày">
          <input type="date" className={inputClass()} value={url.from} max={url.to || undefined} onChange={(e) => setUrl({ from: e.target.value, page: "1" })} />
        </Field>
        <Field label="Đến ngày">
          <input type="date" className={inputClass()} value={url.to} min={url.from || undefined} onChange={(e) => setUrl({ to: e.target.value, page: "1" })} />
        </Field>
        <Field label="Tìm theo email">
          <input type="search" className={inputClass()} value={search} maxLength={100} placeholder="Một phần email" onChange={(e) => setSearch(e.target.value)} />
        </Field>
      </div>
      <QueryBoundary query={logs}>
        {({ items, meta }) =>
          items.length === 0 ? (
            <Empty icon={ScrollText} title="Chưa có thư nào khớp bộ lọc" />
          ) : (
            <>
              <ul className="divide-y divide-outline-variant md:hidden">
                {items.map((l) => (
                  <li key={l.id} className="space-y-1 px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="md-body-medium truncate text-on-surface">{l.email}</span>
                      <span className="md-body-small shrink-0 whitespace-nowrap text-on-surface-variant">{formatVN(l.sentAt)}</span>
                    </div>
                    <p className="md-body-small text-on-surface-variant">{campaignText(l)}</p>
                    <p className="md-body-small flex flex-wrap gap-x-4 text-on-surface-variant">
                      <span>Đã bấm: {l.clicked ? "có" : "không"}</span>
                      <span>Mua Pro sau thư: {l.bought ? "có" : "không"}</span>
                      <span>Quay lại: {l.returned ? "có" : "không"}</span>
                    </p>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <Table>
                  <Thead>
                    <Th>Thời gian</Th>
                    <Th>Người nhận</Th>
                    <Th>Chiến dịch</Th>
                    <Th className="text-center">Đã bấm</Th>
                    <Th className="text-center">Mua Pro sau thư</Th>
                    <Th className="text-center">Quay lại</Th>
                  </Thead>
                  <tbody>
                    {items.map((l) => (
                      <Tr key={l.id}>
                        <Td className="whitespace-nowrap text-on-surface-variant">{formatVN(l.sentAt)}</Td>
                        <Td className="break-all">{l.email}</Td>
                        <Td>{campaignText(l)}</Td>
                        <Td className="text-center"><span className="inline-flex justify-center"><Yes on={l.clicked} label="Đã bấm" /></span></Td>
                        <Td className="text-center"><span className="inline-flex justify-center"><Yes on={l.bought} label="Đã mua Pro" /></span></Td>
                        <Td className="text-center"><span className="inline-flex justify-center"><Yes on={l.returned} label="Đã quay lại" /></span></Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <Pagination meta={meta} onPage={setPage} />
            </>
          )
        }
      </QueryBoundary>
    </Card>
  );
}

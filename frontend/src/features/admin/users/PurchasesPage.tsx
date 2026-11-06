import { Download, Search, ShoppingBag } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { UserCell, UserFilterChip } from "@/features/admin/shared";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { useUrlSearch } from "@/shared/hooks/useUrlSearch";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { inputClass } from "@/shared/ui/Input";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatCredit, formatDateTime } from "@/shared/utils/formatters";

type Kind = "pe" | "unlock" | "single";

const PE_STATUS: Record<string, [string, Tone]> = {
  DONE: ["Thành công", "success"],
  PENDING: ["Đang xử lý", "warning"],
  FAILED: ["Lỗi (đã hoàn)", "danger"],
};

const mb = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// Lịch sử mua trong hệ thống: tải đề PE, gói mở khóa lời giải, giải thích mua lẻ từng câu
export default function PurchasesPage() {
  const [url, setUrl] = useUrlState({ kind: "pe", q: "", userId: "", page: "1" });
  const kind = (["pe", "unlock", "single"].includes(url.kind) ? url.kind : "pe") as Kind;
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const [search, setSearch, q] = useUrlSearch(url.q, setUrl);
  const filter = { page, search: q, userId: url.userId };

  const pe = useApi(() => (kind === "pe" ? adminApi.peDownloads(filter) : Promise.resolve(null)), [kind, page, q, url.userId]);
  const unlock = useApi(() => (kind === "unlock" ? adminApi.explanationUnlocks(filter) : Promise.resolve(null)), [kind, page, q, url.userId]);
  const single = useApi(() => (kind === "single" ? adminApi.explanationPurchases(filter) : Promise.resolve(null)), [kind, page, q, url.userId]);
  const cur = kind === "pe" ? pe : kind === "unlock" ? unlock : single;
  const meta = cur.data?.meta;
  useClampPage(meta, setPage);

  const who = url.userId ? (cur.data?.items[0] as { user?: { fullName: string } } | undefined)?.user?.fullName : undefined;

  let body;
  if (cur.loading && !cur.data) body = <Loading />;
  else if (cur.error) body = <ErrorBox message={cur.error} onRetry={cur.reload} />;
  else if (!cur.data || cur.data.items.length === 0) body = <Empty icon={ShoppingBag} title="Chưa có giao dịch nào" />;
  else if (kind === "pe" && pe.data) {
    body = (
      <>
        <Table>
          <Thead>
            <Th>Thời gian</Th>
            <Th>Thành viên</Th>
            <Th>Đề PE</Th>
            <Th>Trạng thái</Th>
            <Th className="text-right">File</Th>
            <Th className="text-right">Phí</Th>
          </Thead>
          <tbody>
            {pe.data.items.map((d) => (
              <Tr key={d.id}>
                <Td className="whitespace-nowrap text-slate-500">{formatDateTime(d.createdAt)}</Td>
                <Td>
                  <UserCell user={d.user} />
                </Td>
                <Td>
                  <div className="max-w-xs truncate font-medium text-slate-800" title={d.title}>
                    {d.title}
                  </div>
                  <div className="text-xs text-slate-500">Thread {d.threadId}</div>
                  {d.error && <div className="max-w-xs truncate text-xs text-rose-600" title={d.error}>{d.error}</div>}
                </Td>
                <Td>
                  <Badge tone={(PE_STATUS[d.status] ?? ["", "neutral"])[1]}>{(PE_STATUS[d.status] ?? [d.status])[0]}</Badge>
                </Td>
                <Td className="whitespace-nowrap text-right tabular-nums text-slate-500">{d.files > 0 ? `${d.files} · ${mb(d.sizeBytes)}` : "—"}</Td>
                <Td className="whitespace-nowrap text-right tabular-nums">{formatCredit(d.price)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <Pagination meta={pe.data.meta} onPage={setPage} />
      </>
    );
  } else if (kind === "unlock" && unlock.data) {
    body = (
      <>
        <Table>
          <Thead>
            <Th>Thời gian</Th>
            <Th>Thành viên</Th>
            <Th>Đề</Th>
            <Th className="text-right">Số câu</Th>
            <Th className="text-right">Đã trả</Th>
          </Thead>
          <tbody>
            {unlock.data.items.map((d) => (
              <Tr key={d.id}>
                <Td className="whitespace-nowrap text-slate-500">{formatDateTime(d.createdAt)}</Td>
                <Td>
                  <UserCell user={d.user} />
                </Td>
                <Td>
                  <div className="max-w-sm truncate font-medium text-slate-800" title={d.exam.title}>
                    {d.exam.title}
                  </div>
                </Td>
                <Td className="text-right tabular-nums">{d.questions}</Td>
                <Td className="whitespace-nowrap text-right tabular-nums">{formatCredit(d.price)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <Pagination meta={unlock.data.meta} onPage={setPage} />
      </>
    );
  } else if (single.data) {
    body = (
      <>
        <Table>
          <Thead>
            <Th>Thời gian</Th>
            <Th>Thành viên</Th>
            <Th>Đề</Th>
            <Th>Câu</Th>
            <Th className="text-right">Đã trả</Th>
          </Thead>
          <tbody>
            {single.data.items.map((d) => (
              <Tr key={d.id}>
                <Td className="whitespace-nowrap text-slate-500">{formatDateTime(d.createdAt)}</Td>
                <Td>
                  <UserCell user={d.user} />
                </Td>
                <Td>
                  <div className="max-w-sm truncate font-medium text-slate-800" title={d.exam.title}>
                    {d.exam.title}
                  </div>
                </Td>
                <Td className="whitespace-nowrap tabular-nums">Câu {d.questionNumber}</Td>
                <Td className="whitespace-nowrap text-right tabular-nums">{d.isTrial ? <Badge tone="info">Xem thử miễn phí</Badge> : formatCredit(d.price)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        <Pagination meta={single.data.meta} onPage={setPage} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Lịch sử mua" description="Ai đã tải đề PE, mở khóa trọn bộ lời giải hay mua lẻ từng câu." />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <Segmented
            label="Loại giao dịch"
            value={kind}
            onChange={(v: Kind) => setUrl({ kind: v, page: "1" })}
            options={[
              { value: "pe", label: "Tải đề PE" },
              { value: "unlock", label: "Gói mở khóa lời giải" },
              { value: "single", label: "Giải thích mua lẻ" },
            ]}
          />
          <div className="relative min-w-52 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên hoặc email" aria-label="Tìm thành viên" className={`${inputClass()} pl-9`} />
          </div>
          <UserFilterChip userId={url.userId} label={who} onClear={() => setUrl({ userId: "", page: "1" })} />
        </div>
        <div className={cur.loading && cur.data ? "overflow-x-auto opacity-60 transition" : "overflow-x-auto transition"}>{body}</div>
      </Card>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
        <Download size={12} /> Đề PE lỗi đã được hoàn credit tự động; cột “Phí” là số credit đã tính lúc đó.
      </p>
    </>
  );
}

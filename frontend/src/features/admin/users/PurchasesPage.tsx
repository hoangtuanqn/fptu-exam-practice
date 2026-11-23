import { ShoppingBag } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { UserCell, UserFilterChip } from "@/features/admin/shared";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { useUrlSearch } from "@/shared/hooks/useUrlSearch";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Badge } from "@/shared/ui/Badge";
import { Card, PageHeader } from "@/shared/ui/Card";
import { SearchBox } from "@/shared/ui/SearchBox";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatCredit, formatDateTime } from "@/shared/utils/formatters";

type Kind = "unlock" | "single";

// Lịch sử mua trong hệ thống: gói mở khóa lời giải, giải thích mua lẻ từng câu
export default function PurchasesPage() {
  const [url, setUrl] = useUrlState({ kind: "unlock", q: "", userId: "", page: "1" });
  const kind: Kind = url.kind === "single" ? "single" : "unlock";
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const [search, setSearch, q] = useUrlSearch(url.q, setUrl);
  const filter = { page, search: q, userId: url.userId };

  const unlock = useApi(() => (kind === "unlock" ? adminApi.explanationUnlocks(filter) : Promise.resolve(null)), [kind, page, q, url.userId]);
  const single = useApi(() => (kind === "single" ? adminApi.explanationPurchases(filter) : Promise.resolve(null)), [kind, page, q, url.userId]);
  const cur = kind === "unlock" ? unlock : single;
  const meta = cur.data?.meta;
  useClampPage(meta, setPage);

  const who = url.userId ? (cur.data?.items[0] as { user?: { fullName: string } } | undefined)?.user?.fullName : undefined;

  let body;
  if (cur.loading && !cur.data) body = <Loading shape="table" />;
  else if (cur.error) body = <ErrorBox message={cur.error} onRetry={cur.reload} />;
  else if (!cur.data || cur.data.items.length === 0) body = <Empty icon={ShoppingBag} title="Chưa có giao dịch nào" />;
  else if (kind === "unlock" && unlock.data) {
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
      <PageHeader title="Lịch sử mua" description="Ai đã mở khóa trọn bộ lời giải hay mua lẻ từng câu." />
      <Card>
        <div className="panel-filter-row">
          <Segmented
            label="Loại giao dịch"
            value={kind}
            onChange={(v: Kind) => setUrl({ kind: v, page: "1" })}
            options={[
              { value: "unlock", label: "Gói mở khóa lời giải" },
              { value: "single", label: "Giải thích mua lẻ" },
            ]}
          />
          <SearchBox value={search} onChange={setSearch} placeholder="Tìm theo tên hoặc email" label="Tìm thành viên" />
          <UserFilterChip userId={url.userId} label={who} onClear={() => setUrl({ userId: "", page: "1" })} />
        </div>
        <div className={cur.loading && cur.data ? "overflow-x-auto opacity-60 transition" : "overflow-x-auto transition"}>{body}</div>
      </Card>
    </>
  );
}

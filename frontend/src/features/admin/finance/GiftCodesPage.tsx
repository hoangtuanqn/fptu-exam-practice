import { useState } from "react";
import { Gift, Plus, Search } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { GiftCodeDialog } from "@/features/admin/finance/GiftCodeDialog";
import { GiftCodeRedemptionsDialog } from "@/features/admin/finance/GiftCodeRedemptionsDialog";
import { GiftCodeStatusBadge } from "@/shared/components/StatusBadge";
import { ExpandableText } from "@/shared/ui/ExpandableText";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import type { GiftCode } from "@/shared/types/api";
import { Button } from "@/shared/ui/Button";
import { Card, PageHeader } from "@/shared/ui/Card";
import { CopyButton } from "@/shared/ui/CopyButton";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatCredit, formatDate } from "@/shared/utils/formatters";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { errorMessage } from "@/shared/api/errors";
import { useConfirm } from "@/shared/ui/ConfirmDialog";

type ActiveFilter = "" | "true" | "false";

export default function GiftCodesPage() {
  const toast = useToast();
  const [url, setUrl] = useUrlState({ q: "", active: "", page: "1" });
  const active = url.active as ActiveFilter;
  const page = toPage(url.page);
  const [search, setSearch] = useState(url.q);
  const q = useDebounce(search.trim());

  const { data, error, loading, reload } = useApi(() => adminApi.giftCodes(page, { q, active }), [page, q, active]);
  useClampPage(data?.meta, (p) => setUrl({ page: String(p) }));
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<GiftCode | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const toggle = async (g: GiftCode) => {
    const ok = await confirm(
      g.active
        ? { title: `Tắt mã ${g.code}?`, message: "Mã sẽ không dùng được nữa cho tới khi bạn bật lại.", confirmLabel: "Tắt mã", tone: "danger" }
        : { title: `Bật lại mã ${g.code}?`, message: "Người dùng sẽ nhập được mã này để nhận credit (theo số lượt còn lại và hạn của mã).", confirmLabel: "Bật mã" },
    );
    if (!ok) return;
    try {
      await adminApi.setGiftCodeActive(g.id, !g.active);
      toast.success(g.active ? `Đã tắt mã ${g.code}` : `Đã bật mã ${g.code}`);
      reload();
    } catch (e) {
      toast.error(errorMessage(e, "Không đổi được trạng thái"));
    }
  };

  const actions = (g: GiftCode) => (
    <div className="flex items-center justify-end gap-2">
      <Button size="sm" onClick={() => setViewing(g)}>
        Lượt dùng
      </Button>
      <Button size="sm" onClick={() => void toggle(g)}>
        {g.active ? "Tắt" : "Bật"}
      </Button>
    </div>
  );

  return (
    <>
      {confirmDialog}
      <PageHeader
        title="Giftcode"
        description="Tạo mã tặng credit và theo dõi lượt dùng."
        action={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Tạo giftcode
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <label className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value.toUpperCase());
                setUrl({ q: e.target.value.trim().toUpperCase(), page: "1" });
              }}
              placeholder="Tìm theo mã"
              aria-label="Tìm giftcode theo mã"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand-500"
            />
          </label>
          <Segmented<ActiveFilter>
            label="Lọc theo trạng thái bật/tắt"
            value={active}
            onChange={(v) => setUrl({ active: v, page: "1" })}
            options={[
              { value: "", label: "Tất cả" },
              { value: "true", label: "Đang bật" },
              { value: "false", label: "Đã tắt" },
            ]}
          />
        </div>

        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && data.items.length > 0 ? (
          <div className={loading ? "opacity-60 transition" : "transition"}>
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.items.map((g) => (
                <li key={g.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                      {g.code}
                      <CopyButton text={g.code} label="Sao chép mã" />
                    </span>
                    <GiftCodeStatusBadge value={g.status} />
                  </div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium tabular-nums text-emerald-700">{formatCredit(g.amount)}</span>
                    <span className="text-xs text-slate-500">
                      Đã dùng {g.usedCount}/{g.maxUses} · {g.expiresAt ? `hạn ${formatDate(g.expiresAt)}` : "không hết hạn"}
                    </span>
                  </div>
                  {g.note && <ExpandableText text={g.note} className="text-xs text-slate-500" />}
                  {actions(g)}
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <Thead>
                  <Th>Mã</Th>
                  <Th className="text-right">Credit</Th>
                  <Th className="text-right">Đã dùng</Th>
                  <Th>Hạn dùng</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right">Thao tác</Th>
                </Thead>
                <tbody>
                  {data.items.map((g) => (
                    <Tr key={g.id}>
                      <Td>
                        <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                          {g.code}
                          <CopyButton text={g.code} label="Sao chép mã" />
                        </div>
                        {g.note && <ExpandableText text={g.note} className="max-w-[18rem] text-xs text-slate-500" />}
                      </Td>
                      <Td className="text-right tabular-nums">{formatCredit(g.amount)}</Td>
                      <Td className="text-right tabular-nums">
                        {g.usedCount}/{g.maxUses}
                      </Td>
                      <Td className="whitespace-nowrap text-slate-500">{g.expiresAt ? formatDate(g.expiresAt) : "Không hết hạn"}</Td>
                      <Td>
                        <GiftCodeStatusBadge value={g.status} />
                      </Td>
                      <Td>{actions(g)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <Pagination meta={data.meta} onPage={(p) => setUrl({ page: String(p) })} />
          </div>
        ) : (
          <Empty icon={Gift} title={q || active ? "Không có mã nào khớp bộ lọc" : "Chưa có giftcode nào"} />
        )}
      </Card>

      {creating && <GiftCodeDialog onClose={() => setCreating(false)} onCreated={reload} />}
      {viewing && <GiftCodeRedemptionsDialog gift={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

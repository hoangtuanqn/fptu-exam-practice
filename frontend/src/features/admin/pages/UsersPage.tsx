import { useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { UserDialog } from "@/features/admin/components/UserDialog";
import { RoleBadge, UserStatusBadge } from "@/shared/components/StatusBadge";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { inputClass } from "@/shared/ui/Input";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { useApi } from "@/shared/hooks/useApi";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { useDebounce } from "@/shared/hooks/useDebounce";
import type { Role, User, UserStatus } from "@/shared/types/api";
import { formatDate, formatMoney, initials } from "@/shared/utils/formatters";

export default function UsersPage() {
  const [url, setUrl] = useUrlState({ q: "", role: "", status: "", page: "1" });
  const role = url.role as Role | "";
  const status = url.status as UserStatus | "";
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const setRole = (v: Role | "") => setUrl({ role: v, page: "1" });
  const setStatus = (v: UserStatus | "") => setUrl({ status: v, page: "1" });
  const [selected, setSelected] = useState<User | null>(null);

  // Ô tìm kiếm gõ trực tiếp, sau khi ngừng gõ mới đưa lên URL (và về trang 1)
  const [search, setSearch] = useState(url.q);
  const q = useDebounce(search.trim());
  useEffect(() => {
    if (q !== url.q) setUrl({ q, page: "1" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const { data, error, loading, reload } = useApi(() => adminApi.users({ page, search: q, role, status }), [page, q, role, status]);

  return (
    <>
      <PageHeader title="Thành viên" description="Tìm kiếm, phân quyền, khoá tài khoản và chỉnh số dư." />

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-52 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc email"
              aria-label="Tìm thành viên"
              className={`${inputClass()} pl-9`}
            />
          </div>
          <Segmented
            label="Lọc theo vai trò"
            value={role}
            onChange={setRole}
            options={[
              { value: "", label: "Tất cả" },
              { value: "USER", label: "Thành viên" },
              { value: "ADMIN", label: "Quản trị" },
            ]}
          />
          <Segmented
            label="Lọc theo trạng thái"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "Mọi trạng thái" },
              { value: "ACTIVE", label: "Hoạt động" },
              { value: "BANNED", label: "Bị khoá" },
            ]}
          />
        </div>

        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && data.items.length > 0 ? (
          <div className={loading ? "opacity-60 transition" : "transition"}>
            <Table>
              <Thead>
                <Th>Thành viên</Th>
                <Th>Vai trò</Th>
                <Th>Trạng thái</Th>
                <Th className="text-right">Số dư</Th>
                <Th>Ngày tham gia</Th>
              </Thead>
              <tbody>
                {data.items.map((u) => (
                  <Tr key={u.id} onClick={() => setSelected(u)}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
                          {initials(u.fullName)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-800">{u.fullName}</div>
                          <div className="truncate text-xs text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </Td>
                    <Td><RoleBadge value={u.role} /></Td>
                    <Td><UserStatusBadge value={u.status} /></Td>
                    <Td className="text-right tabular-nums">{formatMoney(u.balance)}</Td>
                    <Td className="whitespace-nowrap text-slate-500">{formatDate(u.createdAt)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination meta={data.meta} onPage={setPage} />
          </div>
        ) : (
          <Empty icon={Users} title="Không tìm thấy thành viên nào" />
        )}
      </Card>

      {selected && <UserDialog key={selected.id} user={selected} onClose={() => setSelected(null)} onChanged={reload} />}
    </>
  );
}

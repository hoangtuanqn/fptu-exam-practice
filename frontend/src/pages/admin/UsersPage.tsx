import { useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import { adminApi } from "../../api/admin.api";
import { UserDialog } from "../../components/admin/UserDialog";
import { RoleBadge, UserStatusBadge } from "../../components/common/StatusBadge";
import { Card, PageHeader } from "../../components/ui/Card";
import { Empty, ErrorBox, Loading } from "../../components/ui/Feedback";
import { inputClass } from "../../components/ui/Input";
import { Pagination, Table, Td, Th, Thead, Tr } from "../../components/ui/Table";
import { useApi } from "../../hooks/useApi";
import { useDebounce } from "../../hooks/useDebounce";
import type { Role, User, UserStatus } from "../../types/api";
import { formatDate, formatMoney, initials } from "../../utils/formatters";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<User | null>(null);

  const q = useDebounce(search.trim());
  // Đổi bộ lọc thì về trang 1
  useEffect(() => setPage(1), [q, role, status]);

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
          <select value={role} onChange={(e) => setRole(e.target.value as Role | "")} aria-label="Lọc theo vai trò" className={`${inputClass()} !w-auto`}>
            <option value="">Mọi vai trò</option>
            <option value="USER">Thành viên</option>
            <option value="ADMIN">Quản trị</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as UserStatus | "")} aria-label="Lọc theo trạng thái" className={`${inputClass()} !w-auto`}>
            <option value="">Mọi trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="BANNED">Bị khoá</option>
          </select>
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

import { useNavigate } from "react-router-dom";
import { Search, Users } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { RoleBadge, UserStatusBadge } from "@/shared/components/StatusBadge";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { inputClass } from "@/shared/ui/Input";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { useApi } from "@/shared/hooks/useApi";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { useUrlSearch } from "@/shared/hooks/useUrlSearch";
import type { Role, UserStatus } from "@/shared/types/api";
import { formatDate, formatCredit, initials } from "@/shared/utils/formatters";
import { useClampPage } from "@/shared/hooks/useClampPage";

export default function UsersPage() {
  const [url, setUrl] = useUrlState({ q: "", role: "", status: "", page: "1" });
  const role = url.role as Role | "";
  const status = url.status as UserStatus | "";
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const setRole = (v: Role | "") => setUrl({ role: v, page: "1" });
  const setStatus = (v: UserStatus | "") => setUrl({ status: v, page: "1" });
  const navigate = useNavigate();
  const open = (id: number) => navigate(`/admin/users/${id}`);

  // Ô tìm kiếm gõ trực tiếp, sau khi ngừng gõ mới đưa lên URL (và về trang 1)
  const [search, setSearch, q] = useUrlSearch(url.q, setUrl);

  const { data, error, loading, reload } = useApi(() => adminApi.users({ page, search: q, role, status }), [page, q, role, status]);
  useClampPage(data?.meta, setPage);

  return (
    <>
      <PageHeader title="Thành viên" description="Tìm kiếm thành viên, bấm vào một dòng để mở trang quản lý." />

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
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.items.map((u) => (
                <li key={u.id}>
                  <button onClick={() => open(u.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-slate-50">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">{initials(u.fullName)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900">{u.fullName}</div>
                      <div className="truncate text-xs text-slate-500">{u.email}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <RoleBadge value={u.role} />
                        <UserStatusBadge value={u.status} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900">{formatCredit(u.balance)}</div>
                      <div className="text-xs text-slate-400">{formatDate(u.createdAt)}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
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
                  <Tr key={u.id} onClick={() => open(u.id)}>
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
                    <Td className="text-right tabular-nums">{formatCredit(u.balance)}</Td>
                    <Td className="whitespace-nowrap text-slate-500">{formatDate(u.createdAt)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            </div>
            <Pagination meta={data.meta} onPage={setPage} />
          </div>
        ) : (
          <Empty icon={Users} title="Không tìm thấy thành viên nào" />
        )}
      </Card>

    </>
  );
}

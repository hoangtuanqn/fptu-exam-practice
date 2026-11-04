import { useEffect, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { UserCell, UserFilterChip } from "@/features/admin/shared";
import { formatDuration, formatScore } from "@/features/practice/utils/format";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Badge } from "@/shared/ui/Badge";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { inputClass } from "@/shared/ui/Input";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatDateTime } from "@/shared/utils/formatters";

type Mode = "PRACTICE" | "EXAM" | "";
const MODE_LABEL = { PRACTICE: "Luyện tập", EXAM: "Thi thử" } as const;

// Lịch sử nộp bài của mọi thành viên: đề nào, chế độ, điểm, đúng/sai và thời gian làm
export default function AttemptsPage() {
  const [url, setUrl] = useUrlState({ q: "", mode: "", userId: "", page: "1" });
  const mode = url.mode as Mode;
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });

  const [search, setSearch] = useState(url.q);
  const q = useDebounce(search.trim());
  useEffect(() => {
    if (q !== url.q) setUrl({ q, page: "1" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const { data, error, loading, reload } = useApi(() => adminApi.attempts({ page, search: q, mode, userId: url.userId }), [page, q, mode, url.userId]);
  useClampPage(data?.meta, setPage);
  const who = url.userId ? data?.items[0]?.user : undefined;

  return (
    <>
      <PageHeader title="Lịch sử làm bài" description="Các lần nộp bài của thành viên." />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-52 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên hoặc email" aria-label="Tìm thành viên" className={`${inputClass()} pl-9`} />
          </div>
          <Segmented
            label="Lọc theo chế độ"
            value={mode}
            onChange={(v: Mode) => setUrl({ mode: v, page: "1" })}
            options={[
              { value: "", label: "Tất cả" },
              { value: "PRACTICE", label: "Luyện tập" },
              { value: "EXAM", label: "Thi thử" },
            ]}
          />
          <UserFilterChip userId={url.userId} label={who?.fullName} onClear={() => setUrl({ userId: "", page: "1" })} />
        </div>

        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && data.items.length > 0 ? (
          <div className={loading ? "opacity-60 transition" : "transition"}>
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.items.map((a) => (
                <li key={a.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium text-slate-900">{a.exam.title}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">{formatScore(a.score)}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    {a.user.fullName} · {a.user.email}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {MODE_LABEL[a.mode]} · {a.correct}/{a.totalGraded} đúng · {formatDuration(a.durationSec)} · {formatDateTime(a.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <Thead>
                  <Th>Thời gian</Th>
                  <Th>Thành viên</Th>
                  <Th>Đề</Th>
                  <Th>Chế độ</Th>
                  <Th className="text-right">Điểm</Th>
                  <Th className="text-right">Đúng / sai / bỏ</Th>
                  <Th className="text-right">Thời lượng</Th>
                </Thead>
                <tbody>
                  {data.items.map((a) => (
                    <Tr key={a.id}>
                      <Td className="whitespace-nowrap text-slate-500">{formatDateTime(a.createdAt)}</Td>
                      <Td>
                        <UserCell user={a.user} />
                      </Td>
                      <Td className="max-w-xs truncate" title={a.exam.title}>
                        {a.exam.title}
                      </Td>
                      <Td>
                        <Badge tone={a.mode === "EXAM" ? "info" : "neutral"}>{MODE_LABEL[a.mode]}</Badge>
                      </Td>
                      <Td className="text-right font-medium tabular-nums">{formatScore(a.score)}</Td>
                      <Td className="whitespace-nowrap text-right tabular-nums text-slate-600">
                        {a.correct} / {a.wrong} / {a.skipped}
                      </Td>
                      <Td className="whitespace-nowrap text-right tabular-nums text-slate-500">{formatDuration(a.durationSec)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <Pagination meta={data.meta} onPage={setPage} />
          </div>
        ) : (
          <Empty icon={ClipboardList} title="Chưa có bài làm nào" />
        )}
      </Card>
    </>
  );
}

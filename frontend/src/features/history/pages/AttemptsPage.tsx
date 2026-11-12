import { Link, useNavigate } from "react-router-dom";
import { History } from "lucide-react";
import { historyApi } from "@/features/history/history.api";
import { formatDuration, formatScore } from "@/features/practice/utils/format";
import { PASS_SCORE } from "@/features/practice/config/scoring";
import { getModeConfig } from "@/features/practice/config/modes";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { useApi } from "@/shared/hooks/useApi";
import { Badge } from "@/shared/ui/Badge";
import { Card, PageHeader } from "@/shared/ui/Card";
import { RouteTabs, HISTORY_TABS } from "@/shared/ui/RouteTabs";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatDateTime } from "@/shared/utils/formatters";
import { useClampPage } from "@/shared/hooks/useClampPage";

export default function AttemptsPage() {
  const navigate = useNavigate();
  const [url, setUrl] = useUrlState({ page: "1", examId: "" });
  const page = toPage(url.page);
  const examId = Number(url.examId) || undefined; // có thì chỉ hiện lịch sử của đề này
  const setPage = (p: number) => setUrl({ page: String(p) });
  const { data, error, loading, reload } = useApi(() => historyApi.list(page, undefined, examId), [page, examId]);
  useClampPage(data?.meta, setPage);

  return (
    <>
      <div className="mb-4">
        <RouteTabs label="Lịch sử" tabs={HISTORY_TABS} />
      </div>
      <PageHeader title="Lịch sử làm bài" description="Mỗi lần nộp bài được lưu lại điểm và chi tiết từng câu." />
      {examId && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-900">
          <span className="min-w-0 truncate">
            Đang xem lịch sử của đề: <b>{data?.items[0]?.exam.title ?? `#${examId}`}</b>
          </span>
          <Link to="/account/attempts" className="shrink-0 font-medium text-brand-700 hover:underline">
            Xem tất cả
          </Link>
        </div>
      )}
      <Card>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : (
          data &&
          (data.items.length === 0 ? (
            <Empty icon={History} title="Chưa có bài làm nào">
              Nhập đề từ link FuOverflow ở trang chủ và nộp bài, kết quả sẽ hiện ở đây.
            </Empty>
          ) : (
            <>
              <ul className="divide-y divide-slate-100 md:hidden">
                {data.items.map((a) => (
                  <li key={a.id}>
                    <button onClick={() => navigate(`/account/attempts/${a.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900">{a.exam.title}</div>
                        <div className="mt-0.5 text-xs text-slate-500">
                          {a.mode === "EXAM" ? "Thi" : "Luyện tập"} · {formatDateTime(a.createdAt)} · {a.correct}/{a.totalGraded} · {formatDuration(a.durationSec)}
                        </div>
                      </div>
                      <Badge tone={a.score >= PASS_SCORE ? "success" : "danger"}>{formatScore(a.score)}</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            <div className="hidden md:block">
              <Table>
                <Thead>
                  <Th>Nộp lúc</Th>
                  <Th>Đề</Th>
                  <Th>Chế độ</Th>
                  <Th className="text-right">Đúng</Th>
                  <Th className="text-right">Thời gian</Th>
                  <Th className="text-right">Điểm</Th>
                </Thead>
                <tbody>
                  {data.items.map((a) => (
                    <Tr key={a.id} onClick={() => navigate(`/account/attempts/${a.id}`)}>
                      <Td className="whitespace-nowrap text-slate-500">{formatDateTime(a.createdAt)}</Td>
                      <Td className="max-w-[18rem] truncate font-medium text-slate-800">{a.exam.title}</Td>
                      <Td>{getModeConfig(a.mode === "EXAM" ? "exam" : "practice").label}</Td>
                      <Td className="whitespace-nowrap text-right tabular-nums">
                        {a.correct}/{a.totalGraded}
                      </Td>
                      <Td className="whitespace-nowrap text-right tabular-nums text-slate-500">
                        {formatDuration(a.durationSec)}
                      </Td>
                      <Td className="text-right">
                        <Badge tone={a.score >= PASS_SCORE ? "success" : "danger"}>{formatScore(a.score)}</Badge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
              <Pagination meta={data.meta} onPage={setPage} />
            </>
          ))
        )}
      </Card>
    </>
  );
}

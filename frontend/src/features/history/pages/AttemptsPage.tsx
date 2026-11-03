import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { History } from "lucide-react";
import { historyApi } from "@/features/history/history.api";
import { formatDuration, formatScore } from "@/features/practice/utils/format";
import { PASS_SCORE } from "@/features/practice/config/scoring";
import { getModeConfig } from "@/features/practice/config/modes";
import { useApi } from "@/shared/hooks/useApi";
import { Badge } from "@/shared/ui/Badge";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatDateTime } from "@/shared/utils/formatters";

export default function AttemptsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApi(() => historyApi.list(page), [page]);

  return (
    <>
      <PageHeader title="Lịch sử làm bài" description="Mỗi lần nộp bài được lưu lại điểm và chi tiết từng câu." />
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
                      <Td className="whitespace-nowrap text-right font-mono tabular-nums text-slate-500">
                        {formatDuration(a.durationSec)}
                      </Td>
                      <Td className="text-right">
                        <Badge tone={a.score >= PASS_SCORE ? "success" : "danger"}>{formatScore(a.score)}</Badge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              <Pagination meta={data.meta} onPage={setPage} />
            </>
          ))
        )}
      </Card>
    </>
  );
}

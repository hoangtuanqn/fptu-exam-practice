import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useOnLibraryChanged } from "@/features/exam-library/libraryEvents";
import { examLibraryApi, type LibraryExam } from "@/features/exam-library/exam-library.api";
import { ResumeList } from "@/features/practice-session/ResumeList";
import { formatScore } from "@/features/practice/utils/format";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Badge } from "@/shared/ui/Badge";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatDate } from "@/shared/utils/formatters";

const AnswerBadge = ({ source }: { source: LibraryExam["answerSource"] }) =>
  source === "PENDING" ? (
    <Badge tone="info">AI đang giải</Badge>
  ) : source === "FAILED" || source === "DEFAULT" ? (
    <Badge tone="warning">Chưa có đáp án</Badge>
  ) : null;

const attemptsText = (e: LibraryExam) => (e.attempts > 0 ? `${e.attempts} lần · cao nhất ${formatScore(e.bestScore ?? 0)}` : "Chưa làm");

// Toàn bộ đề đã lấy về, phân trang trên server (trang chủ chỉ hiện vài đề gần nhất)
export default function LibraryPage() {
  const [url, setUrl] = useUrlState({ page: "1" });
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const { data, error, loading, reload } = useApi(() => examLibraryApi.list(page), [page]);
  useOnLibraryChanged(reload);
  useClampPage(data?.meta, setPage);

  return (
    <>
      <PageHeader title="Kho đề của tôi" description="Các đề bạn đã lấy từ FuOverflow. Mỗi lần bấm vào một đề là một lượt làm mới, lượt đang dở được lưu lại để làm tiếp." />
      <ResumeList limit={10} className="mb-5" />
      <Card>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && data.items.length > 0 ? (
          <div className={loading ? "opacity-60 transition" : "transition"}>
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.items.map((e) => (
                <li key={e.id}>
                  <Link to={`/exam/${e.threadId}`} className="block px-4 py-3 transition active:bg-slate-50">
                    <div className="truncate text-sm font-medium text-slate-900">{e.title}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {e.totalQuestions} câu · {attemptsText(e)}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <AnswerBadge source={e.answerSource} />
                      <span className="text-xs text-slate-400">Thêm {formatDate(e.addedAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <Thead>
                  <Th>Đề</Th>
                  <Th className="text-right">Số câu</Th>
                  <Th>Đã làm</Th>
                  <Th>Đáp án</Th>
                  <Th>Thêm lúc</Th>
                </Thead>
                <tbody>
                  {data.items.map((e) => (
                    <Tr key={e.id}>
                      <Td>
                        <Link to={`/exam/${e.threadId}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                          {e.title}
                        </Link>
                      </Td>
                      <Td className="text-right tabular-nums">{e.totalQuestions}</Td>
                      <Td className="whitespace-nowrap text-slate-600">{attemptsText(e)}</Td>
                      <Td>
                        <AnswerBadge source={e.answerSource} />
                      </Td>
                      <Td className="whitespace-nowrap text-slate-500">{formatDate(e.addedAt)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <Pagination meta={data.meta} onPage={setPage} />
          </div>
        ) : (
          <Empty icon={BookOpen} title="Bạn chưa lấy đề nào">
            Dán link FuOverflow ở trang chủ để lấy đề đầu tiên.
          </Empty>
        )}
      </Card>
    </>
  );
}

import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Eye, History } from "lucide-react";
import { useOnLibraryChanged } from "@/features/exam-store/libraryEvents";
import { examLibraryApi, type LibraryExam } from "@/features/exam-store/exam-library.api";
import { ResumeList } from "@/features/practice-session/ResumeList";
import { formatScore } from "@/features/practice/utils/format";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Badge } from "@/shared/ui/Badge";
import { buttonClass } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatDate } from "@/shared/utils/formatters";

const AnswerBadge = ({ source }: { source: LibraryExam["answerSource"] }) =>
  source === "PENDING" ? (
    <Badge tone="info">Đang chuẩn bị đáp án</Badge>
  ) : source === "FAILED" || source === "DEFAULT" ? (
    <Badge tone="warning">Chưa có đáp án</Badge>
  ) : null;

const attemptsText = (e: LibraryExam) => (e.attempts > 0 ? `${e.attempts} lần · cao nhất ${formatScore(e.bestScore ?? 0)}` : "Chưa làm");

// Đã làm rồi thì bấm vào để xem lịch sử các lần làm của đề đó
const AttemptsCell = ({ e }: { e: LibraryExam }) =>
  e.attempts > 0 ? (
    <Link to={`/account/attempts?examId=${e.id}`} className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
      <History size={13} />
      {attemptsText(e)}
    </Link>
  ) : (
    <>{attemptsText(e)}</>
  );

// Mở trang xem đề chỉ đọc (bấm tên đề vẫn là vào làm bài)
const ViewLink = ({ threadId }: { threadId: string }) => (
  <Link to={`/exam/${threadId}/view`} className={buttonClass({ size: "sm", variant: "text" })}>
    <Eye size={15} /> Xem đề
  </Link>
);

// Tab "Của tôi" trong Kho đề: toàn bộ đề đã lấy về, phân trang trên server (trang chủ chỉ hiện vài đề gần nhất)
export function MyExamsTab() {
  const navigate = useNavigate();
  const [url, setUrl] = useUrlState({ page: "1" });
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const { data, error, loading, reload } = useApi(() => examLibraryApi.list(page), [page]);
  useOnLibraryChanged(reload);
  useClampPage(data?.meta, setPage);

  return (
    <>
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
                <li key={e.id} className="flex items-center gap-1 pr-2">
                  <Link to={`/exam/${e.threadId}`} className="block min-w-0 flex-1 px-4 py-3 transition active:bg-slate-50">
                    <div className="truncate text-sm font-medium text-slate-900">{e.title}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {e.totalQuestions} câu · {attemptsText(e)}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <AnswerBadge source={e.answerSource} />
                      {e.attempts > 0 && (
                        <span
                          role="link"
                          onClick={(ev) => {
                            ev.preventDefault();
                            navigate(`/account/attempts?examId=${e.id}`);
                          }}
                          className="text-xs font-medium text-brand-700 underline"
                        >
                          Xem lịch sử
                        </span>
                      )}
                      <span className="text-xs text-slate-400">Thêm {formatDate(e.addedAt)}</span>
                    </div>
                  </Link>
                  <ViewLink threadId={e.threadId} />
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <Thead>
                  <Th>Đề</Th>
                  <Th className="text-right">Số câu</Th>
                  <Th>Lịch sử làm bài</Th>
                  <Th>Đáp án</Th>
                  <Th>Thêm lúc</Th>
                </Thead>
                <tbody>
                  {data.items.map((e) => (
                    <Tr key={e.id}>
                      <Td>
                        <div className="flex items-center justify-between gap-2">
                          <Link to={`/exam/${e.threadId}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                            {e.title}
                          </Link>
                          <ViewLink threadId={e.threadId} />
                        </div>
                      </Td>
                      <Td className="text-right tabular-nums">{e.totalQuestions}</Td>
                      <Td className="whitespace-nowrap text-slate-600">
                        <AttemptsCell e={e} />
                      </Td>
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

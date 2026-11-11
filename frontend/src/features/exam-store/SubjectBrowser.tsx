import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Loader2, Play } from "lucide-react";
import { ConfirmFetchDialog } from "@/features/exam-import/components/ConfirmFetchDialog";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import { useExamImport } from "@/features/exam-import/useExamImport";
import { useAuth } from "@/features/auth/AuthContext";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { Button } from "@/shared/ui/Button";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Pagination } from "@/shared/ui/Table";
import { formatCredit, formatDate } from "@/shared/utils/formatters";
import { fuoThreadUrl } from "@/shared/utils/fuo-link";
import { isPro } from "@/shared/utils/pro";
import { CompactSubjectPicker } from "@/features/subject/CompactSubjectPicker";
import { SubjectCard } from "@/features/subject/SubjectCard";
import { SubjectPicker } from "@/features/subject/SubjectPicker";
import { catalogApi, type CatalogItem } from "./catalog.api";
import { ExamFilterBar, useExamListQuery } from "./ExamFilterBar";
import { featuredSubjects } from "./featuredSubjects";

const COMPACT_PAGE_SIZE = 6; // trang chủ: chỉ vài đề mỗi trang để không đẩy các phần bên dưới đi quá xa

// Kho đề > Theo môn: toàn bộ đề FE của một môn (danh mục FuOverflow + đề hệ thống đã có). Chỉ lấy ảnh khi người dùng bấm và đồng ý trừ phí.
export function SubjectBrowser({ compact = false }: { compact?: boolean }) {
  const [url, setUrl] = useUrlState({ subject: "" });
  const code = url.subject.toUpperCase();
  return code ? <ExamList code={code} compact={compact} onBack={() => setUrl({ subject: "" })} /> : <SubjectChooser compact={compact} onPick={(c) => setUrl({ subject: c })} />;
}

function SubjectChooser({ onPick, compact }: { onPick: (code: string) => void; compact: boolean }) {
  const { user } = useAuth();
  const subjects = useApi(() => catalogApi.subjects(), []);
  const mine = useApi(() => (user ? catalogApi.mySubjects() : Promise.resolve([] as string[])), [user?.id]);
  const list = useMemo(() => subjects.data?.map((s) => ({ code: s.code, name: s.name, badge: `${s.total} đề` })), [subjects.data]);
  if (compact) {
    // Trang chủ: môn của tôi trước, rồi các môn có sẵn đề; còn lại tìm bằng ô tìm kiếm
    const quick = [...new Set([...(mine.data ?? []), ...featuredSubjects(subjects.data)])].slice(0, 8);
    return <CompactSubjectPicker subjects={list} loading={subjects.loading} error={subjects.error} onRetry={subjects.reload} onPick={onPick} quick={quick} allHref="/account/exams?tab=subject" />;
  }
  return (
    <SubjectPicker
      subjects={list}
      loading={subjects.loading}
      error={subjects.error}
      onRetry={subjects.reload}
      onPick={onPick}
      mine={mine.data ?? []}
      emptyHint="Thử mã môn khác, hoặc dán link FuOverflow ở trang chủ để lấy đề mới."
    />
  );
}

function ExamList({ code, onBack, compact }: { code: string; onBack: () => void; compact: boolean }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, refresh } = useAuth();
  const query = useExamListQuery();
  const { url, setUrl, page } = query;

  const list = useApi(() => catalogApi.exams(code, { q: url.q, term: url.term, page, limit: compact ? COMPACT_PAGE_SIZE : undefined }), [code, url.q, url.term, page, compact, user?.id]);
  const d = list.data;
  const job = useExamImport();
  const [quoting, setQuoting] = useState<string | null>(null); // threadId đang hỏi phí
  const [confirm, setConfirm] = useState<{ item: CatalogItem; fee: number } | null>(null);
  const running = job.phase === "running";
  const busy = running || quoting !== null;

  // Lấy xong thì mở đề; số dư vừa đổi nên tải lại
  useEffect(() => {
    if (job.exam) {
      void refresh();
      navigate(`/exam/${job.exam.threadId}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.exam]);

  const pick = async (item: CatalogItem) => {
    if (!user) return void navigate("/login");
    if (item.status === "owned") return void navigate(`/exam/${item.threadId}`);
    setQuoting(item.threadId);
    try {
      // Hỏi phí thực tế và kiểm tra trước khi trừ tiền (đúng nhãn, đúng môn); miễn phí (Pro, đã sở hữu) thì lấy luôn
      const quote = await examImportApi.quote(fuoThreadUrl(item.threadId), code);
      if (quote.free) void job.start(fuoThreadUrl(item.threadId), code);
      else setConfirm({ item, fee: quote.fee });
    } catch (err) {
      toast.error(errorMessage(err, "Chưa lấy được đề này"));
    } finally {
      setQuoting(null);
    }
  };

  return (
    <>
      <SubjectCard title={`Môn ${code}`} onBack={onBack}>
        <div className="space-y-3 border-b border-outline-variant px-5 py-4">
          <ExamFilterBar query={query} terms={d?.terms} />
          {running && (
            <p className="flex items-center gap-2 rounded-m3-md bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant" role="status">
              <Loader2 size={16} className="animate-spin" /> {job.stage ?? "Đang lấy đề…"} Đề mới có thể mất vài phút, đừng đóng trang.
            </p>
          )}
          {job.phase === "failed" && (
            <p className="flex items-center justify-between gap-2 rounded-m3-md bg-error-container px-4 py-3 text-sm text-on-error-container" role="alert">
              <span>{job.error ?? "Không lấy được đề này"} Nếu đã bị trừ credit, hệ thống tự hoàn lại.</span>
              <Button size="sm" variant="text" onClick={job.reset}>
                Đóng
              </Button>
            </p>
          )}
        </div>

        <QueryBoundary query={list}>
          {(data) =>
            data.items.length === 0 ? (
              <Empty icon={BookOpen} title={data.total > 0 ? "Không có đề nào khớp" : "Chưa có đề nào của môn này"}>
                {data.total > 0 ? "Thử bỏ bộ lọc hoặc đổi từ khoá." : "Danh mục đề của môn này chưa được cập nhật. Bạn vẫn có thể dán link FuOverflow ở trang chủ."}
              </Empty>
            ) : (
              <>
                <ul className="divide-y divide-outline-variant">
                  {data.items.map((e) => (
                    <li key={e.threadId} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="md-title-small truncate text-on-surface">{e.title}</p>
                        <p className="md-body-small flex flex-wrap items-center gap-x-3 text-on-surface-variant">
                          {e.postedAt && <span>{formatDate(e.postedAt)}</span>}
                          {e.questions !== null ? <span>{e.questions} câu</span> : null}
                        </p>
                      </div>
                      <Button size="sm" variant="tonal" onClick={() => void pick(e)} disabled={busy}>
                        {quoting === e.threadId ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                        {e.status !== "owned" && data.price > 0 && !isPro(user) ? formatCredit(data.price) : "Mở đề"}
                      </Button>
                    </li>
                  ))}
                </ul>
                <Pagination meta={data.meta} onPage={(p) => setUrl({ page: String(p) })} />
              </>
            )
          }
        </QueryBoundary>
      </SubjectCard>

      {confirm && (
        <ConfirmFetchDialog
          url={fuoThreadUrl(confirm.item.threadId)}
          fee={confirm.fee}
          pro={isPro(user)}
          balance={user ? user.balance : null}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const item = confirm.item;
            setConfirm(null);
            void job.start(fuoThreadUrl(item.threadId), code);
          }}
        />
      )}
    </>
  );
}

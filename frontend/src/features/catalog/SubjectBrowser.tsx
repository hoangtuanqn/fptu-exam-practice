import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Check, Download, Loader2, Play, Search } from "lucide-react";
import { ConfirmFetchDialog } from "@/features/exam-import/components/ConfirmFetchDialog";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import { useExamImport } from "@/features/exam-import/useExamImport";
import { useAuth } from "@/features/auth/AuthContext";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Pagination } from "@/shared/ui/Table";
import { formatDate } from "@/shared/utils/formatters";
import { isPro } from "@/shared/utils/pro";
import { SubjectCard } from "@/features/subject/SubjectCard";
import { SubjectPicker } from "@/features/subject/SubjectPicker";
import { catalogApi, type CatalogItem } from "./catalog.api";

const fuoUrl = (threadId: string) => `https://fuoverflow.com/threads/${threadId}/`;

// Kho đề > Theo môn: toàn bộ đề FE của một môn (danh mục FuOverflow + đề hệ thống đã có). Chỉ lấy ảnh khi người dùng bấm và đồng ý trừ phí.
export function SubjectBrowser() {
  const [url, setUrl] = useUrlState({ subject: "" });
  const code = url.subject.toUpperCase();
  return code ? <ExamList code={code} onBack={() => setUrl({ subject: "" })} /> : <SubjectChooser onPick={(c) => setUrl({ subject: c })} />;
}

function SubjectChooser({ onPick }: { onPick: (code: string) => void }) {
  const { user } = useAuth();
  const subjects = useApi(() => catalogApi.subjects(), []);
  const mine = useApi(() => (user ? catalogApi.mySubjects() : Promise.resolve([] as string[])), [user?.id]);
  const list = useMemo(() => subjects.data?.map((s) => ({ code: s.code, name: s.name, badge: `${s.total} đề` })), [subjects.data]);
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

function ExamList({ code, onBack }: { code: string; onBack: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, refresh } = useAuth();
  const [url, setUrl] = useUrlState({ term: "", q: "", page: "1" });
  const page = toPage(url.page);
  const [typed, setTyped] = useState(url.q);
  // Gõ xong mới tìm (đỡ gọi máy chủ mỗi phím)
  useEffect(() => {
    const id = setTimeout(() => typed !== url.q && setUrl({ q: typed, page: "1" }), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed]);

  const list = useApi(() => catalogApi.exams(code, { q: url.q, term: url.term, page }), [code, url.q, url.term, page, user?.id]);
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
      const quote = await examImportApi.quote(fuoUrl(item.threadId), code);
      if (quote.free) void job.start(fuoUrl(item.threadId), code);
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
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Tìm trong các đề của môn" aria-label="Tìm đề" className="h-10 w-full rounded-m3-md border border-outline-variant bg-surface-container-lowest pl-9 pr-3 text-sm outline-none focus:border-primary" />
          </label>
          {d && d.terms.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Lọc theo kỳ">
              <button type="button" onClick={() => setUrl({ term: "", page: "1" })} className={`h-8 rounded-full border px-3 text-sm ${!url.term ? "border-transparent bg-secondary-container text-on-secondary-container" : "border-outline-variant text-on-surface"}`}>
                Tất cả
              </button>
              {d.terms.map((t) => (
                <button key={t.term} type="button" onClick={() => setUrl({ term: t.term, page: "1" })} className={`h-8 rounded-full border px-3 text-sm ${url.term === t.term ? "border-transparent bg-secondary-container text-on-secondary-container" : "border-outline-variant text-on-surface"}`}>
                  {t.term} <span className="text-xs text-on-surface-variant">{t.count}</span>
                </button>
              ))}
            </div>
          )}
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

        {list.loading && !d ? (
          <Loading />
        ) : list.error ? (
          <ErrorBox message={list.error} onRetry={list.reload} />
        ) : !d || d.items.length === 0 ? (
          <Empty icon={BookOpen} title={d && d.total > 0 ? "Không có đề nào khớp" : "Chưa có đề nào của môn này"}>
            {d && d.total > 0 ? "Thử bỏ bộ lọc hoặc đổi từ khoá." : "Danh mục đề của môn này chưa được cập nhật. Bạn vẫn có thể dán link FuOverflow ở trang chủ."}
          </Empty>
        ) : (
          <div className={list.loading ? "opacity-60 transition" : "transition"}>
            <ul className="divide-y divide-outline-variant">
              {d.items.map((e) => (
                <li key={e.threadId} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="md-title-small truncate text-on-surface">{e.title}</p>
                    <p className="md-body-small flex flex-wrap items-center gap-x-3 text-on-surface-variant">
                      {e.postedAt && <span>{formatDate(e.postedAt)}</span>}
                      {e.questions !== null ? <span>{e.questions} câu</span> : null}
                    </p>
                  </div>
                  <StatusBadge status={e.status} />
                  <Button size="sm" variant={e.status === "fetch" ? "tonal" : e.status === "owned" ? "text" : "primary"} onClick={() => void pick(e)} disabled={busy}>
                    {quoting === e.threadId ? <Loader2 size={15} className="animate-spin" /> : e.status === "fetch" ? <Download size={15} /> : <Play size={15} />}
                    {e.status === "owned" ? "Mở đề" : e.status === "ready" ? "Lấy đề" : "Lấy từ FuOverflow"}
                  </Button>
                </li>
              ))}
            </ul>
            <Pagination meta={d.meta} onPage={(p) => setUrl({ page: String(p) })} />
          </div>
        )}
      </SubjectCard>

      {confirm && (
        <ConfirmFetchDialog
          url={fuoUrl(confirm.item.threadId)}
          fee={confirm.fee}
          pro={isPro(user)}
          balance={user ? user.balance : null}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const item = confirm.item;
            setConfirm(null);
            void job.start(fuoUrl(item.threadId), code);
          }}
        />
      )}
    </>
  );
}

function StatusBadge({ status }: { status: CatalogItem["status"] }) {
  if (status === "owned")
    return (
      <Badge tone="success">
        <Check size={13} /> Trong kho
      </Badge>
    );
  if (status === "ready") return <Badge tone="info">Sẵn sàng · có đáp án</Badge>;
  return <Badge tone="neutral">Chưa lấy</Badge>;
}

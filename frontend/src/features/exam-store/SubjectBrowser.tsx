import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Loader2, Play } from "lucide-react";
import { examApi } from "@/features/exam/exam.api";
import { examOpenPath } from "@/features/exam/types";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { Button } from "@/shared/ui/Button";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Pagination } from "@/shared/ui/Table";
import { formatCredit, formatDate } from "@/shared/utils/formatters";
import { isPro } from "@/shared/utils/pro";
import { CompactSubjectPicker } from "@/features/subject/CompactSubjectPicker";
import { SubjectCard } from "@/features/subject/SubjectCard";
import { SubjectPicker } from "@/features/subject/SubjectPicker";
import { catalogApi, type CatalogItem } from "./catalog.api";
import { ConfirmOpenDialog } from "./ConfirmOpenDialog";
import { ExamFilterBar, useExamListQuery } from "./ExamFilterBar";
import { featuredSubjects } from "./featuredSubjects";
import { NewExamBadge } from "./NewExamBadge";
import { ExamKindBadge } from "./ExamKindBadge";
import { DoneBadge } from "./DoneBadge";

const COMPACT_PAGE_SIZE = 6; // trang chủ: chỉ vài đề mỗi trang để không đẩy các phần bên dưới đi quá xa

// Kho đề > Theo môn: các đề hệ thống đã có của một môn. Đề có phí chỉ trừ khi người dùng bấm và đồng ý.
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
    return <CompactSubjectPicker subjects={list} loading={subjects.loading} error={subjects.error} onRetry={subjects.reload} onPick={onPick} quick={quick} allHref="/kho-de" />;
  }
  return (
    <SubjectPicker
      subjects={list}
      loading={subjects.loading}
      error={subjects.error}
      onRetry={subjects.reload}
      onPick={onPick}
      mine={mine.data ?? []}
      emptyHint="Thử mã môn khác."
    />
  );
}

const priceOf = (d: { price: number; pePrice?: number }, e: CatalogItem) => (e.kind === "PE" ? (d.pePrice ?? d.price) : d.price);

function ExamList({ code, onBack, compact }: { code: string; onBack: () => void; compact: boolean }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, refresh } = useAuth();
  const query = useExamListQuery();
  const { url, setUrl, page } = query;

  const list = useApi(() => catalogApi.exams(code, { q: url.q, term: url.term, kind: url.kind, page, limit: compact ? COMPACT_PAGE_SIZE : undefined }), [code, url.q, url.term, url.kind, page, compact, user?.id]);
  const d = list.data;
  const [busy, setBusy] = useState<string | null>(null); // examId đang hỏi phí / đang mở
  const [confirm, setConfirm] = useState<{ examId: string; item: CatalogItem; fee: number } | null>(null);

  const open = async (examId: string, item: CatalogItem) => {
    setBusy(examId);
    try {
      await examApi.unlock(examId, code);
      void refresh(); // số dư vừa đổi
      navigate(examOpenPath({ id: examId, kind: item.kind, totalQuestions: item.questions }));
    } catch (err) {
      toast.error(errorMessage(err, "Chưa mở được đề này"));
      if (err instanceof ApiError && err.code === "EXAM_NOT_READY") list.reload(); // đề vừa bị gỡ: tải lại danh sách cho đúng trạng thái
    } finally {
      setBusy(null);
    }
  };

  const pick = async (item: CatalogItem) => {
    if (!user) return void navigate("/login");
    const examId = item.examId;
    if (!examId) return;
    if (item.status === "owned") return void navigate(examOpenPath({ id: examId, kind: item.kind, totalQuestions: item.questions }));
    setBusy(examId);
    try {
      // Hỏi phí thực tế trước khi trừ tiền; miễn phí (Pro, đã sở hữu) thì mở luôn
      const quote = await examApi.quote(examId, code);
      if (quote.free) return void (await open(examId, item));
      setConfirm({ examId, item, fee: quote.fee });
    } catch (err) {
      toast.error(errorMessage(err, "Chưa mở được đề này"));
      if (err instanceof ApiError && err.code === "EXAM_NOT_READY") list.reload();
    } finally {
      setBusy((b) => (b === examId ? null : b));
    }
  };

  return (
    <>
      <SubjectCard title={`Môn ${code}`} onBack={onBack}>
        <div className="space-y-3 border-b border-outline-variant px-5 py-4">
          <ExamFilterBar query={query} terms={d?.terms} />
        </div>

        <QueryBoundary query={list}>
          {(res) => {
            // Chỉ hiện đề đã có trong hệ thống (máy chủ cũ còn trả mục chưa có đề)
            const data = { ...res, items: res.items.filter((e) => !!e.examId) };
            return data.items.length === 0 ? (
              <Empty icon={BookOpen} title={data.total > 0 ? "Không có đề nào khớp" : "Chưa có đề nào của môn này"}>
                {data.total > 0 ? "Thử bỏ bộ lọc hoặc đổi từ khoá." : "Môn này chưa có đề, bạn quay lại sau nhé."}
              </Empty>
            ) : (
              <>
                <ul className="divide-y divide-outline-variant">
                  {data.items.map((e) => (
                    <li key={e.examId} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <ExamKindBadge kind={e.kind} />
                          {/* Mobile: nhãn lên trước, tiêu đề xuống dòng riêng để đọc được; từ sm trở lên nằm cùng một hàng */}
                          <p className="md-title-small order-last line-clamp-2 basis-full break-words text-on-surface sm:order-none sm:line-clamp-1 sm:min-w-0 sm:flex-1 sm:basis-0" title={e.title}>{e.title}</p>
                          <NewExamBadge term={e.term} />
                          <DoneBadge attempts={e.attempts} />
                        </div>
                        <p className="md-body-small flex flex-wrap items-center gap-x-3 text-on-surface-variant">
                          {e.postedAt && <span>{formatDate(e.postedAt)}</span>}
                          {e.questions ? <span>{e.questions} câu</span> : null}
                        </p>
                      </div>
                      <Button size="sm" variant="tonal" onClick={() => void pick(e)} disabled={busy !== null}>
                        {busy === e.examId ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                        {e.status !== "owned" && priceOf(data, e) > 0 && !isPro(user) ? formatCredit(priceOf(data, e)) : e.attempts ? "Làm lại" : "Mở đề"}
                      </Button>
                    </li>
                  ))}
                </ul>
                <Pagination meta={data.meta} onPage={(p) => setUrl({ page: String(p) })} />
              </>
            );
          }}
        </QueryBoundary>
      </SubjectCard>

      {confirm && user && (
        <ConfirmOpenDialog
          fee={confirm.fee}
          balance={user.balance}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const { examId, item } = confirm;
            setConfirm(null);
            void open(examId, item);
          }}
        />
      )}
    </>
  );
}

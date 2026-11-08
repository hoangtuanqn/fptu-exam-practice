import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Check, Loader2, Play, Search } from "lucide-react";
import { ConfirmFetchDialog } from "@/features/exam-import/components/ConfirmFetchDialog";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import { useAuth } from "@/features/auth/AuthContext";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { isPro } from "@/shared/utils/pro";
import { catalogApi, type CatalogExam } from "./catalog.api";

const fuoUrl = (threadId: string) => `https://fuoverflow.com/threads/${threadId}/`;

// Thư viện đề theo môn: chọn môn, chọn một trong các đề hệ thống đã có sẵn (không cần đi tìm link FuOverflow).
export default function CatalogPage() {
  const [url, setUrl] = useUrlState({ subject: "" });
  const code = url.subject.toUpperCase();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Học tập" title="Thư viện đề theo môn" description="Chọn môn và chọn đề có sẵn của hệ thống, không cần đi tìm link." />
      {code ? <ExamList code={code} onBack={() => setUrl({ subject: "" })} /> : <SubjectList onPick={(c) => setUrl({ subject: c })} />}
    </div>
  );
}

function SubjectList({ onPick }: { onPick: (code: string) => void }) {
  const subjects = useApi(() => catalogApi.subjects(), []);
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = subjects.data ?? [];
    return term ? list.filter((s) => s.code.toLowerCase().includes(term) || (s.name ?? "").toLowerCase().includes(term)) : list;
  }, [subjects.data, q]);

  return (
    <Card>
      <CardHeader title="Chọn môn" />
      <div className="space-y-3 p-5">
        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Gõ mã môn hoặc tên môn" aria-label="Tìm môn" className="h-11 w-full rounded-m3-md border border-outline-variant bg-surface-container-lowest pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </label>
        {subjects.loading && !subjects.data ? (
          <Loading />
        ) : subjects.error ? (
          <ErrorBox message={subjects.error} onRetry={subjects.reload} />
        ) : shown.length === 0 ? (
          <Empty icon={BookOpen} title="Chưa có môn nào khớp">
            Thử mã môn khác, hoặc lấy đề mới bằng link FuOverflow ở trang chủ.
          </Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {shown.map((s) => (
              <li key={s.code}>
                <button type="button" onClick={() => onPick(s.code)} className="md-state flex w-full items-center gap-3 rounded-m3-md border border-outline-variant px-4 py-3 text-left">
                  <span className="md-title-small w-20 shrink-0 text-primary">{s.code}</span>
                  <span className="md-body-medium min-w-0 flex-1 truncate text-on-surface">{s.name ?? "Môn học"}</span>
                  <Badge tone="info">{s.exams} đề</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function ExamList({ code, onBack }: { code: string; onBack: () => void }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, refresh } = useAuth();
  const list = useApi(() => catalogApi.exams(code), [code, user?.id]);
  const [busy, setBusy] = useState<string | null>(null); // threadId đang xử lý
  const [confirm, setConfirm] = useState<{ exam: CatalogExam; fee: number } | null>(null);

  const open = (e: CatalogExam) => navigate(`/exam/${e.threadId}`);

  // Đề đã có trong kho thì mở luôn; chưa có thì hỏi phí thực tế (đúng luồng lấy đề), xác nhận rồi mới lấy
  const pick = async (e: CatalogExam) => {
    if (!user) return void navigate("/login");
    if (e.owned) return open(e);
    setBusy(e.threadId);
    try {
      const quote = await examImportApi.quote(fuoUrl(e.threadId));
      if (quote.free) await take(e);
      else setConfirm({ exam: e, fee: quote.fee });
    } catch (err) {
      toast.error(errorMessage(err, "Chưa lấy được đề này"));
    } finally {
      setBusy(null);
    }
  };

  const take = async (e: CatalogExam) => {
    setBusy(e.threadId);
    try {
      await examImportApi.submit(fuoUrl(e.threadId));
      void refresh(); // số dư vừa đổi
      open(e);
    } catch (err) {
      toast.error(errorMessage(err, "Chưa lấy được đề này"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader
          title={`Môn ${code}`}
          action={
            <Button size="sm" variant="text" onClick={onBack}>
              <ArrowLeft size={15} /> Đổi môn
            </Button>
          }
        />
        {list.loading && !list.data ? (
          <Loading />
        ) : list.error ? (
          <ErrorBox message={list.error} onRetry={list.reload} />
        ) : !list.data || list.data.length === 0 ? (
          <Empty icon={BookOpen} title="Chưa có đề nào của môn này">
            Bạn có thể lấy đề mới bằng link FuOverflow ở trang chủ.
          </Empty>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {list.data.map((e) => (
              <li key={e.threadId} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="md-title-small truncate text-on-surface">{e.title}</p>
                  <p className="md-body-small text-on-surface-variant">{e.questions} câu · có đáp án AI</p>
                </div>
                {e.owned && (
                  <Badge tone="success">
                    <Check size={13} /> Đã có trong kho
                  </Badge>
                )}
                <Button size="sm" variant={e.owned ? "text" : "primary"} onClick={() => void pick(e)} disabled={busy !== null}>
                  {busy === e.threadId ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                  {e.owned ? "Mở đề" : "Lấy đề"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {confirm && (
        <ConfirmFetchDialog
          url={fuoUrl(confirm.exam.threadId)}
          fee={confirm.fee}
          pro={isPro(user)}
          balance={user ? user.balance : null}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const e = confirm.exam;
            setConfirm(null);
            void take(e);
          }}
        />
      )}
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, CircleDashed, Link2, Loader2, XCircle } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { examImportApi, type QuoteResult } from "@/features/exam-import/exam-import.api";
import type { ImportedExam } from "@/features/exam-import/types";
import { depositLink } from "@/features/explanation/depositLink";
import { VerifyEmailNotice } from "@/features/verify-email/VerifyEmailNotice";
import { ApiError } from "@/shared/api/client";
import { Button, buttonClass } from "@/shared/ui/Button";
import { ChargeSummary } from "@/shared/ui/ChargeSummary";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { formatCredit } from "@/shared/utils/formatters";
import { checkFuoLink } from "@/shared/utils/fuo-link";
import { useLinkBatch } from "./useLinkBatch";

interface Props {
  subject: string; // mã môn: máy chủ kiểm từng link có đúng môn này trước khi trừ phí
  slots: number; // còn được thêm tối đa bao nhiêu đề
  pickedThreads: Set<string>; // mã thread các đề đã chọn (link trùng thì bỏ qua)
  onImported: (exam: ImportedExam) => void;
}

type Quote = { status: "ok"; quote: QuoteResult } | { status: "error"; message: string };
interface Entry {
  raw: string;
  threadId: string | null;
  error: string | null; // link sai định dạng
  skip: "picked" | "duplicate" | "limit" | null;
}

const PLACEHOLDER = "https://fuoverflow.com/threads/pro192-su26-fe.7094/\nhttps://fuoverflow.com/threads/pro192-su25-fe.6120/";

// Nhập nhiều link đề FuOverflow cùng lúc (mỗi dòng một link). Mỗi link được kiểm tra và báo phí riêng trước khi lấy;
// tổng phí hiện trong hộp xác nhận. Đề đã có trong kho của bạn thì miễn phí.
export function MultiLinkImport({ subject, slots, pickedThreads, onImported }: Props) {
  const { user, refresh } = useAuth();
  const [text, setText] = useState("");
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [confirming, setConfirming] = useState(false);
  const inflight = useRef(new Set<string>());
  const alive = useRef(true);
  const batch = useLinkBatch(subject, onImported, () => void refresh());
  const wasRunning = useRef(false);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const entries = useMemo<Entry[]>(() => {
    const seen = new Set<string>();
    let taken = 0;
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((raw): Entry => {
        const c = checkFuoLink(raw);
        if (!c.ok) return { raw, threadId: null, error: c.message || "Link không hợp lệ", skip: null };
        if (pickedThreads.has(c.threadId)) return { raw, threadId: c.threadId, error: null, skip: "picked" };
        if (seen.has(c.threadId)) return { raw, threadId: c.threadId, error: null, skip: "duplicate" };
        seen.add(c.threadId);
        if (++taken > slots) return { raw, threadId: c.threadId, error: null, skip: "limit" };
        return { raw, threadId: c.threadId, error: null, skip: null };
      });
  }, [text, slots, pickedThreads]);

  const candidates = entries.filter((e) => !e.error && !e.skip);
  const missingKey = candidates.filter((e) => !quotes[e.raw]).map((e) => e.raw).join("\n");

  // Hỏi máy chủ phí và tính hợp lệ của từng link mới (gộp bằng debounce). Kết quả giữ lại, đổi chữ ở dòng khác không phải hỏi lại.
  useEffect(() => {
    if (!missingKey) return;
    const timer = setTimeout(() => {
      for (const raw of missingKey.split("\n")) {
        if (inflight.current.has(raw)) continue;
        inflight.current.add(raw);
        examImportApi
          .quote(raw, subject)
          .then((quote) => alive.current && setQuotes((cur) => ({ ...cur, [raw]: { status: "ok", quote } })))
          .catch((err: unknown) => {
            const message = err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 429 ? err.message : "Chưa kiểm tra được link này, bạn thử lại sau";
            if (alive.current) setQuotes((cur) => ({ ...cur, [raw]: { status: "error", message } }));
          })
          .finally(() => inflight.current.delete(raw));
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [missingKey, subject]);

  const ready = candidates.filter((e) => quotes[e.raw]?.status === "ok");
  const checking = candidates.some((e) => !quotes[e.raw]);
  const total = ready.reduce((n, e) => n + ((quotes[e.raw] as Extract<Quote, { status: "ok" }>).quote.fee || 0), 0);
  const freeCount = ready.filter((e) => ((quotes[e.raw] as Extract<Quote, { status: "ok" }>).quote.fee || 0) === 0).length;
  const unverified = !!user && !user.emailVerifiedAt;
  const balance = user ? user.balance : null;
  const retryable = candidates.some((e) => quotes[e.raw]?.status === "error");

  const start = () => {
    setConfirming(false);
    void batch.run(ready.map((e) => ({ link: e.raw, threadId: e.threadId! })));
  };

  // Lấy xong: bỏ các dòng đã lấy được khỏi ô nhập, giữ lại dòng lỗi để thử lại
  useEffect(() => {
    if (wasRunning.current && !batch.running) {
      const done = new Set(batch.items.filter((i) => i.status === "done").map((i) => i.threadId));
      setText((cur) =>
        cur
          .split(/\r?\n/)
          .filter((l) => {
            const c = checkFuoLink(l);
            return !(c.ok && done.has(c.threadId));
          })
          .join("\n"),
      );
    }
    wasRunning.current = batch.running;
  }, [batch.running, batch.items]);

  const finished = batch.items.length > 0 && !batch.running;
  const doneCount = batch.items.filter((i) => i.status === "done").length;

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (finished) batch.clear();
        }}
        disabled={batch.running}
        rows={4}
        placeholder={PLACEHOLDER}
        aria-label="Các link đề FuOverflow, mỗi dòng một link"
        className="block w-full resize-y rounded-m3-md border border-outline bg-surface px-4 py-3 font-mono text-xs leading-relaxed text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
      />
      <p className="md-body-small mt-1.5 text-on-surface-variant">Mỗi dòng một link, thêm được tối đa {slots} đề nữa. Đề đã có trong kho của bạn thì không bị trừ credit.</p>

      {entries.length > 0 && !batch.running && batch.items.length === 0 && (
        <ul className="mt-3 divide-y divide-outline-variant overflow-hidden rounded-m3-md border border-outline-variant" aria-live="polite">
          {entries.map((e, i) => (
            <li key={`${i}-${e.raw}`} className="flex items-start gap-2.5 px-3 py-2.5">
              <RowIcon entry={e} quote={quotes[e.raw]} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-on-surface-variant" title={e.raw}>
                  {e.raw}
                </p>
                <RowNote entry={e} quote={quotes[e.raw]} slots={slots} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {batch.items.length > 0 && (
        <ul className="mt-3 divide-y divide-outline-variant overflow-hidden rounded-m3-md border border-outline-variant" aria-live="polite">
          {batch.items.map((it) => (
            <li key={it.threadId} className="flex items-start gap-2.5 px-3 py-2.5">
              {it.status === "done" ? (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
              ) : it.status === "failed" ? (
                <XCircle size={16} className="mt-0.5 shrink-0 text-error" />
              ) : it.status === "running" ? (
                <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-primary" />
              ) : (
                <CircleDashed size={16} className="mt-0.5 shrink-0 text-outline" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-on-surface-variant" title={it.link}>
                  {it.link}
                </p>
                <p className={`md-body-small ${it.status === "failed" ? "text-error" : it.status === "done" ? "text-success" : "text-on-surface-variant"}`}>
                  {it.status === "done" ? "Đã thêm vào danh sách chọn" : it.status === "failed" ? it.error : it.status === "running" ? (it.stage ?? "Đang xử lý") : "Đang chờ tới lượt"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {finished && (
        <p role="status" className="md-body-small mt-2 text-on-surface-variant">
          Đã thêm <b className="text-on-surface">{doneCount}/{batch.items.length}</b> đề.
          {doneCount < batch.items.length && " Link lỗi vẫn nằm trong ô nhập để bạn thử lại; nếu đã bị trừ credit, hệ thống tự hoàn lại."}
        </p>
      )}

      {unverified ? (
        <div className="mt-3">
          <VerifyEmailNotice variant="inline" message="Bạn cần xác minh email trước khi lấy đề." />
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={() => (total > 0 ? setConfirming(true) : start())} disabled={ready.length === 0 || checking || batch.running}>
            {batch.running ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
            {batch.running ? "Đang lấy đề…" : ready.length > 0 ? `Lấy ${ready.length} đề${total > 0 ? ` · ${formatCredit(total)}` : " · miễn phí"}` : "Lấy đề"}
          </Button>
          {retryable && !batch.running && (
            <Button size="sm" variant="text" onClick={() => setQuotes((cur) => Object.fromEntries(Object.entries(cur).filter(([, q]) => q.status === "ok")))}>
              Kiểm tra lại
            </Button>
          )}
          {checking && (
            <span className="md-body-small inline-flex items-center gap-1.5 text-on-surface-variant">
              <Loader2 size={13} className="animate-spin" /> Đang kiểm tra link…
            </span>
          )}
        </div>
      )}

      {confirming && (
        <Modal onClose={() => setConfirming(false)}>
          <ModalTitle icon={Link2}>Xác nhận lấy {ready.length} đề</ModalTitle>
          <p className="md-body-medium mt-3 text-on-surface-variant">
            {freeCount > 0 ? `${freeCount} đề miễn phí, ${ready.length - freeCount} đề tính phí. ` : ""}Các đề được lấy lần lượt; đề nào lỗi sẽ được hoàn phí tự động.
          </p>
          <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container px-3 py-2">
            {ready.map((e) => {
              const q = (quotes[e.raw] as Extract<Quote, { status: "ok" }>).quote;
              return (
                <li key={e.raw} className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate text-on-surface-variant" title={q.title ?? e.raw}>
                    {q.title ?? e.raw}
                  </span>
                  <span className={`shrink-0 tabular-nums ${q.fee > 0 ? "text-error" : "text-success"}`}>{q.fee > 0 ? `−${formatCredit(q.fee)}` : "Miễn phí"}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4">
            <ChargeSummary amount={total} balance={balance} />
          </div>
          <ModalActions>
            <Button grow onClick={() => setConfirming(false)}>
              Hủy
            </Button>
            {balance !== null && balance < total ? (
              <Link to={depositLink(total - balance, "/account/chapters")} className={buttonClass({ variant: "primary", grow: true })}>
                Nạp credit
              </Link>
            ) : (
              <Button grow variant="primary" onClick={start}>
                Trả {formatCredit(total)}
              </Button>
            )}
          </ModalActions>
        </Modal>
      )}
    </div>
  );
}

function RowIcon({ entry, quote }: { entry: Entry; quote?: Quote }) {
  if (entry.error || quote?.status === "error") return <AlertCircle size={16} className="mt-0.5 shrink-0 text-error" />;
  if (entry.skip) return <CircleDashed size={16} className="mt-0.5 shrink-0 text-outline" />;
  if (quote?.status === "ok") return <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />;
  return <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-primary" />;
}

function RowNote({ entry, quote, slots }: { entry: Entry; quote?: Quote; slots: number }) {
  const base = "md-body-small";
  if (entry.error) return <p className={`${base} text-error`}>{entry.error}</p>;
  if (entry.skip === "picked") return <p className={`${base} text-on-surface-variant`}>Đề này đã có trong danh sách chọn.</p>;
  if (entry.skip === "duplicate") return <p className={`${base} text-on-surface-variant`}>Link trùng với dòng trên, bỏ qua.</p>;
  if (entry.skip === "limit") return <p className={`${base} text-warning`}>Quá số đề được thêm (còn {slots} đề), dòng này chưa được lấy.</p>;
  if (!quote) return <p className={`${base} text-on-surface-variant`}>Đang kiểm tra…</p>;
  if (quote.status === "error") return <p className={`${base} text-error`}>{quote.message}</p>;
  const q = quote.quote;
  if (q.fee > 0) return <p className={`${base} text-on-surface`}>Phí lấy đề: {formatCredit(q.fee)}</p>;
  return (
    <p className={`${base} text-success`}>
      {q.reason === "owned" ? `Đã có trong kho của bạn${q.title ? `: ${q.title}` : ""}, mở lại miễn phí` : q.reason === "in-progress" ? "Đang lấy dở, không trừ thêm" : q.reason === "free" ? "Đề miễn phí của thư viện" : "Miễn phí"}
    </p>
  );
}

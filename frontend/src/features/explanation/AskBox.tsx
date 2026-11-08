import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Crown, Loader2, MessageCircleQuestion, Send } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { Markdown } from "@/shared/ui/Markdown";
import { explanationApi, type AskQuota, type AskTurn } from "./explanation.api";

const MAX_CHARS = 600;
const SUGGESTIONS = ["Giải thích kỹ hơn giúp mình", "Tại sao đáp án mình chọn sai?", "Cho mình ví dụ tương tự"];

interface Props {
  examId: number;
  questionNumber: number;
  sessionId: number;
}

// Hỏi thêm AI về đúng câu đang xem (sau khi đã xem đáp án và lời giải thích). Máy chủ kiểm lại điều kiện và giới hạn lượt mỗi ngày.
export function AskBox({ examId, questionNumber, sessionId }: Props) {
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<AskQuota | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    explanationApi
      .askQuota()
      .then((q) => alive && setQuota(q))
      .catch(() => undefined); // phần phụ: lỗi thì bỏ qua, máy chủ vẫn chặn khi hết lượt
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (turns.length > 0) endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [turns, busy]);

  const out = quota !== null && quota.remaining <= 0;

  async function send(content: string) {
    const question = content.trim();
    if (!question || busy || out) return;
    const next: AskTurn[] = [...turns, { role: "user", content: question }];
    setTurns(next);
    setText("");
    setError(null);
    setBusy(true);
    try {
      const r = await explanationApi.ask(examId, questionNumber, sessionId, next);
      setTurns([...next, { role: "assistant", content: r.reply }]);
      setQuota((q) => ({ limit: r.limit, remaining: r.remaining, pro: q?.pro ?? false }));
    } catch (err) {
      setError(errorMessage(err, "Chưa hỏi được, bạn thử lại nhé"));
      setTurns(turns); // bỏ câu hỏi chưa được trả lời để gửi lại được
      setText(question);
      explanationApi.askQuota().then(setQuota).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void send(text);
  };

  return (
    <section aria-label="Hỏi thêm AI về câu này" className="mt-5 border-t border-slate-100 pt-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <MessageCircleQuestion size={16} className="text-brand-700" /> Chưa hiểu? Hỏi thêm AI
        {quota && (
          <span className="ml-auto text-xs font-normal text-slate-500" title="Số lượt hỏi AI còn lại hôm nay">
            Còn {quota.remaining}/{quota.limit} lượt hôm nay
          </span>
        )}
      </h3>

      {turns.length === 0 && !out && (
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => void send(s)} disabled={busy} className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50">
              {s}
            </button>
          ))}
        </div>
      )}

      {turns.length > 0 && (
        <ul className="mt-3 space-y-3">
          {turns.map((t, i) => (
            <li key={i} className={t.role === "user" ? "flex justify-end" : ""}>
              {t.role === "user" ? (
                <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand-50 px-3 py-2 text-sm text-brand-900">{t.content}</p>
              ) : (
                <div className="rounded-2xl rounded-bl-md bg-slate-50 px-3 py-2">
                  <Markdown>{t.content}</Markdown>
                </div>
              )}
            </li>
          ))}
          {busy && (
            <li className="flex items-center gap-2 text-xs text-slate-500" role="status">
              <Loader2 size={14} className="animate-spin" /> AI đang trả lời…
            </li>
          )}
        </ul>
      )}
      {turns.length === 0 && busy && (
        <p className="mt-3 flex items-center gap-2 text-xs text-slate-500" role="status">
          <Loader2 size={14} className="animate-spin" /> AI đang trả lời…
        </p>
      )}

      {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

      {out ? (
        <p className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span>Bạn đã dùng hết lượt hỏi AI hôm nay.</span>
          {!quota.pro && (
            <Link to="/pro" className="inline-flex items-center gap-1 font-semibold text-brand-800 hover:underline">
              <Crown size={12} className="text-[#f0a800]" /> Pro có nhiều lượt hơn
            </Link>
          )}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-3 flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(text);
              }
            }}
            rows={2}
            placeholder="Hỏi về câu này…"
            aria-label="Câu hỏi cho AI"
            className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-slate-200 bg-surface-container-lowest px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
          <button type="submit" disabled={busy || text.trim().length === 0} aria-label="Gửi câu hỏi" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white transition hover:bg-brand-800 disabled:opacity-40">
            <Send size={18} />
          </button>
        </form>
      )}
      <div ref={endRef} />
    </section>
  );
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, ChevronDown, Crown, MessageCircleQuestion, RotateCcw, X } from "lucide-react";
import { ApiError } from "@/shared/api/client";
import { errorMessage, isRetryable } from "@/shared/api/errors";
import { Markdown } from "@/shared/ui/Markdown";
import { canShowPrompt, markPromptShown } from "@/shared/utils/promptCap";
import { trackPrompt } from "@/shared/utils/trackPrompt";
import { CHAT_QUOTA_EXCEEDED, explanationApi, type ChatQuota, type ExplainChatMessage } from "./explanation.api";

const SURFACE = "explain-chat";
const MAX_CHARS = 1000;
const MAX_MESSAGES = 20; // máy chủ chỉ nhận chừng này tin gần nhất
const SUGGESTIONS = ["Giải thích đơn giản hơn", "Vì sao các đáp án còn lại sai?", "Cho mình một ví dụ tương tự"];

// "còn 3 giờ 12 phút" tới mốc reset thật do máy chủ trả về; không hợp lệ thì bỏ qua
function untilReset(resetsAt: string | undefined): string | null {
  const ms = resetsAt ? new Date(resetsAt).getTime() - Date.now() : NaN;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const min = Math.ceil(ms / 60_000);
  const h = Math.floor(min / 60);
  return h > 0 ? `còn ${h} giờ ${min % 60} phút` : `còn ${min} phút`;
}

interface Props {
  examId: number;
  questionNumber: number;
}

// Hỏi tiếp AI về đúng câu đang xem lời giải. Hội thoại chỉ giữ trong bộ nhớ, đổi câu là bắt đầu lại.
export function ExplainChat({ examId, questionNumber }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ExplainChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; retry: boolean } | null>(null);
  const [quota, setQuota] = useState<ChatQuota | null>(null);
  const [exceeded, setExceeded] = useState(false);
  const [lastNote, setLastNote] = useState<boolean | null>(null); // null = chưa xét; chỉ xét một lần khi còn đúng 1 lượt
  const quotaAsked = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadQuota = () =>
    explanationApi
      .chatQuota()
      .then(setQuota)
      .catch(() => undefined); // không lấy được hạn mức thì vẫn cho hỏi, chỉ không hiện số lượt

  useEffect(() => {
    if (!open) return;
    if (!quotaAsked.current) {
      quotaAsked.current = true;
      void loadQuota();
    }
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy, open]);

  const free = !!quota && !quota.unlimited && quota.limit !== null && quota.remaining !== null;
  const outOfTurns = exceeded || (free && quota.remaining === 0);

  useEffect(() => {
    if (outOfTurns) trackPrompt(SURFACE, "shown");
  }, [outOfTurns]);

  useEffect(() => {
    if (lastNote !== null || !free || quota.remaining !== 1) return;
    const ok = canShowPrompt(SURFACE);
    setLastNote(ok);
    if (ok) {
      markPromptShown(SURFACE);
      trackPrompt(SURFACE, "shown");
    }
  }, [free, quota, lastNote]);

  async function send(text: string) {
    const content = text.trim().slice(0, MAX_CHARS);
    if (!content || busy || outOfTurns) return;
    const base: ExplainChatMessage[] = [...messages, { role: "user", content }];
    const payload = base.slice(-MAX_MESSAGES);
    while (payload[0] && payload[0].role !== "user") payload.shift();
    setMessages(base);
    setInput("");
    setError(null);
    setBusy(true);
    try {
      const res = await explanationApi.chat(examId, questionNumber, payload);
      setMessages([...base, { role: "assistant", content: res.reply }]);
      if (res.quota) setQuota(res.quota);
    } catch (err) {
      // Tin chưa gửi được thì bỏ khỏi khung chat và trả lại chữ vào ô nhập
      setMessages(messages);
      setInput(text);
      if (err instanceof ApiError && err.code === CHAT_QUOTA_EXCEEDED) {
        setExceeded(true);
        void loadQuota(); // lấy mốc reset thật
      } else {
        setError({ text: errorMessage(err, "Chưa gửi được câu hỏi. Bạn thử lại nhé."), retry: isRetryable(err) });
      }
    } finally {
      setBusy(false);
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        className="mt-5 flex min-h-10 w-full items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50"
      >
        <MessageCircleQuestion size={17} className="shrink-0 text-brand-700" />
        <span className="flex-1">Chưa hiểu? Hỏi AI về câu này</span>
        <ChevronDown size={16} className="shrink-0 text-slate-400" />
      </button>
    );
  }

  const wait = untilReset(quota?.resetsAt);

  return (
    <section aria-label={`Hỏi AI về câu ${questionNumber}`} className="mt-5 rounded-xl border border-slate-200">
      <header className="flex items-center gap-2 border-b border-slate-100 py-1.5 pl-3.5 pr-1.5">
        <h3 className="flex-1 text-sm font-semibold text-slate-900">Hỏi AI về câu này</h3>
        {quota?.unlimited ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-b from-[#ffd75e] to-[#f0a800] px-2 py-0.5 text-[11px] font-bold text-[#3a2600]">
            <Crown size={11} /> Hỏi không giới hạn
          </span>
        ) : (
          free && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">Còn {quota.remaining}/{quota.limit} lượt hôm nay</span>
        )}
        <button type="button" onClick={() => setOpen(false)} aria-expanded aria-label="Thu gọn hỏi AI" title="Thu gọn" className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
          <X size={16} />
        </button>
      </header>

      <div role="log" aria-live="polite" aria-label="Hội thoại với AI" className="space-y-3 px-3.5 py-3">
        {messages.length === 0 && !outOfTurns && (
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => void send(s)} disabled={busy} className="min-h-10 rounded-full border border-brand-200 px-3 py-1.5 text-left text-[13px] text-slate-700 transition hover:bg-brand-50 disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm leading-relaxed text-on-primary [overflow-wrap:anywhere]">
              {m.content}
            </div>
          ) : (
            <div key={i} className="min-w-0 rounded-2xl rounded-bl-md bg-slate-50 px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 [overflow-wrap:anywhere]">
              <Markdown>{m.content}</Markdown>
            </div>
          ),
        )}
        {busy && (
          <div role="status" className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1" aria-hidden>
              <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.3s]" />
              <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.15s]" />
              <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" />
            </span>
            AI đang trả lời…
          </div>
        )}
        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <span className="min-w-0 flex-1">{error.text}</span>
            {error.retry && (
              <button type="button" onClick={() => void send(input)} disabled={busy || !input.trim()} className="flex min-h-10 items-center gap-1 rounded-full px-3 font-semibold ring-1 ring-rose-200 transition hover:bg-rose-100 disabled:opacity-50">
                <RotateCcw size={12} /> Thử lại
              </button>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {outOfTurns ? (
        <div className="m-3 mt-0 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-950">
          <p className="font-semibold">Bạn đã dùng hết {quota?.limit ?? ""} lượt hỏi hôm nay</p>
          <p className="mt-0.5 text-xs">Lượt mới có lúc 0h{wait ? ` (${wait})` : ""}.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              to="/pro"
              onClick={() => trackPrompt(SURFACE, "click")}
              className="pro-cta inline-flex min-h-10 items-center gap-1.5 rounded-full bg-gradient-to-b from-[#ffd75e] to-[#f0a800] px-4 text-sm font-bold text-[#3a2600] transition hover:brightness-105"
            >
              <Crown size={14} /> Nâng cấp Pro để hỏi không giới hạn
            </Link>
            <button
              type="button"
              onClick={() => {
                trackPrompt(SURFACE, "dismiss");
                setOpen(false);
              }}
              className="min-h-10 rounded-full px-4 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
            >
              Để mai
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="border-t border-slate-100 px-3 pb-2 pt-2.5">
          {lastNote && free && quota.remaining === 1 && (
            <p className="mb-2 flex items-center gap-1 rounded-lg bg-amber-50 py-1 pl-3 pr-1 text-xs text-amber-950">
              <span className="flex-1">
                Còn 1 lượt hôm nay.{" "}
                <Link to="/pro" onClick={() => trackPrompt(SURFACE, "click")} className="font-semibold underline">
                  Pro hỏi không giới hạn.
                </Link>
              </span>
              <button
                type="button"
                onClick={() => {
                  trackPrompt(SURFACE, "dismiss");
                  setLastNote(false);
                }}
                aria-label="Ẩn lời nhắc"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-amber-900/60 hover:bg-amber-100"
              >
                <X size={14} />
              </button>
            </p>
          )}
          <label htmlFor={`explain-chat-${questionNumber}`} className="sr-only">
            Câu hỏi cho AI về câu {questionNumber}
          </label>
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-1 pl-3 pr-1 transition focus-within:border-brand-400">
            <textarea
              id={`explain-chat-${questionNumber}`}
              ref={inputRef}
              value={input}
              rows={2}
              maxLength={MAX_CHARS}
              disabled={busy}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder="Bạn chưa hiểu chỗ nào?"
              className="max-h-32 min-h-[2.5rem] min-w-0 flex-1 resize-none bg-transparent py-1.5 text-sm leading-5 text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Gửi câu hỏi"
              title="Gửi"
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition hover:brightness-110 disabled:bg-slate-200 disabled:text-slate-400"
            >
              <ArrowUp size={17} strokeWidth={2.5} />
            </button>
          </div>
          <div className="mt-1.5 flex gap-2 px-1 text-[11px] leading-snug text-slate-400">
            <span className="flex-1">AI có thể sai, hãy đối chiếu với tài liệu môn học.</span>
            {input.length >= MAX_CHARS - 200 && (
              <span aria-live="polite" className={input.length >= MAX_CHARS ? "text-rose-600" : ""}>
                {input.length}/{MAX_CHARS}
              </span>
            )}
          </div>
        </form>
      )}
    </section>
  );
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { ArrowUp, RotateCcw, X } from "lucide-react";
import { chatApi, type ChatMessage } from "@/features/chat/chat.api";
import { MASCOT_SVG } from "@/shared/ui/mascot-art";
import { Markdown } from "@/shared/ui/Markdown";
import { errorMessage } from "@/shared/api/errors";

const STORE_KEY = "fepass_chat_v2";

// Mặt con cóc (cắt từ hình mascot) làm ảnh đại diện trong khung chat
const AVATAR_SVG = MASCOT_SVG.replace(/viewBox="[^"]*" width="\d+" height="\d+"/, 'viewBox="20 12 64 60" width="100%" height="100%"');
const MAX_CHARS = 800;
const SUGGESTIONS = ["Cách lấy đề từ FuOverflow?", "Nạp credit như thế nào?", "Cài tiện ích Chrome ra sao?", "Tải đề PE thế nào?"];
const GREETING: ChatMessage = {
  role: "assistant",
  content: "Chào bạn, mình là Cóc Pass của FEPass đây. Bạn đang vướng chỗ nào khi dùng web thì cứ hỏi mình nhé: lấy đề, làm bài, nạp credit, tải đề PE, cài tiện ích…",
};

function Avatar({ size = 28 }: { size?: number }) {
  return <span aria-hidden className="block shrink-0 overflow-hidden rounded-full bg-amber-100 ring-1 ring-amber-200" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: AVATAR_SVG }} />;
}

interface Msg extends ChatMessage {
  failed?: string; // tin của người dùng gửi không thành công: lý do hiện nhỏ dưới tin, kèm nút gửi lại
}

const load = (): Msg[] => {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Msg[]) : null;
    const ok = Array.isArray(parsed) ? parsed.filter((m) => m.content && !(m as { error?: boolean }).error) : [];
    return ok.length > 0 ? ok.slice(-30) : [GREETING];
  } catch {
    return [GREETING];
  }
};

// Bong bóng hỏi đáp hướng dẫn sử dụng. Chỉ hiện khi máy chủ báo chatbot đang bật; hội thoại nhớ trong tab (sessionStorage).
export default function ChatWidget() {
  const { pathname } = useLocation();
  const [enabled, setEnabled] = useState(true); // chỉ ẩn khi máy chủ báo rõ là đã tắt (máy chủ chưa phản hồi thì vẫn hiện)
  const [tip, setTip] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(load);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(""); // Cóc Pass đang tra cứu gì (lúc chưa có chữ nào)
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const acRef = useRef<AbortController | null>(null);

  // Rời trang/đóng chat giữa lúc đang trả lời thì dừng luôn để không tốn token
  useEffect(() => () => acRef.current?.abort(), []);

  useEffect(() => {
    let alive = true;
    chatApi
      .config()
      .then((c) => {
        if (!alive) return;
        setEnabled(c.enabled);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // Bong bóng lời chào hiện vài giây mỗi lần tải trang, để khách biết con cóc là nơi hỏi đáp
  useEffect(() => {
    const show = setTimeout(() => setTip(true), 1500);
    const hide = setTimeout(() => setTip(false), 9000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      /* bỏ qua */
    }
  }, [messages]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Không hiện ở khu quản trị và ở màn hình làm bài/luyện tập (tránh gây xao nhãng)
  if (!enabled || pathname.startsWith("/admin") || pathname.startsWith("/exam/")) return null;

  async function send(text: string, history: Msg[] = messages) {
    const content = text.trim().slice(0, MAX_CHARS);
    if (!content || busy) return;
    const base: Msg[] = [...history, { role: "user", content }];
    // Chỉ gửi các lượt hợp lệ (bỏ lời chào và thông báo lỗi), tin đầu phải là của người dùng
    const payload = base.filter((m) => !m.failed).slice(-6).map(({ role, content }) => ({ role, content })); // chỉ gửi vài lượt gần nhất (máy chủ cũng cắt như vậy)
    while (payload[0] && payload[0].role !== "user") payload.shift();

    setMessages([...base, { role: "assistant", content: "" }]); // khung trả lời rỗng, chữ chảy vào dần
    setInput("");
    setBusy(true);
    const ac = new AbortController();
    acRef.current = ac;
    let acc = "";
    try {
      await chatApi.askStream(payload, {
        signal: ac.signal,
        onStatus: setStatus,
        onDelta: (t) => {
          setStatus("");
          acc += t;
          setMessages([...base, { role: "assistant", content: acc }]);
        },
      });
    } catch (err) {
      if (ac.signal.aborted) {
        setMessages(acc ? [...base, { role: "assistant", content: acc }] : base); // người dùng tự đóng: giữ phần đã nhận
      } else if (acc) {
        setMessages([...base, { role: "assistant", content: `${acc}

*(câu trả lời bị gián đoạn)*` }]);
      } else {
        // Không tạo bong bóng trả lời lỗi: đánh dấu ngay tin của người dùng, giống các app nhắn tin
        const reason = errorMessage(err, "Mình đang bận chút, bạn thử lại sau nhé");
        setMessages([...history, { role: "user", content, failed: reason }]);
      }
    } finally {
      setBusy(false);
      setStatus("");
      acRef.current = null;
    }
  }

  // Gửi lại tin bị lỗi: bỏ bản lỗi rồi gửi lại như mới
  const retry = (index: number) => {
    const q = messages[index];
    if (q?.failed) void send(q.content, messages.filter((_, j) => j !== index));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const lift = "bottom-1";
  const showChips = messages.length <= 1 && !busy;

  return (
    <>
      {!open && (
        <div className={`fixed right-2 ${lift} z-[55] flex flex-col items-end sm:right-4`}>
          {tip && (
            <div className="mascot-chat-tip relative mb-1 mr-2 max-w-[11rem] rounded-2xl rounded-br-sm border border-amber-200 bg-surface-container-lowest px-3 py-2 text-xs font-medium text-slate-700 shadow-lg">
              Bạn có thắc mắc gì không? Hỏi Cóc Pass nhé!
              <button onClick={() => setTip(false)} aria-label="Ẩn lời chào" className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300">
                <X size={11} />
              </button>
            </div>
          )}
          <button
            onClick={() => {
              setTip(false);
              setOpen(true);
            }}
            aria-label="Hỏi Cóc Pass"
            title="Hỏi Cóc Pass"
            className="mascot-chat block rounded-full transition active:scale-95"
          >
            <span className="mascot-chat-body block" dangerouslySetInnerHTML={{ __html: MASCOT_SVG }} />
          </button>
        </div>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Chat với Cóc Pass"
          className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-[#fffdf7] sm:inset-x-auto sm:bottom-5 sm:left-auto sm:right-5 sm:top-auto sm:h-[min(34rem,calc(100dvh-2.5rem))] sm:w-[23rem] sm:rounded-3xl sm:border sm:border-amber-200/70 sm:shadow-[0_20px_60px_-15px_rgba(120,80,0,0.35)]"
        >
          <div className="flex items-center gap-3 border-b border-amber-100 bg-amber-50/70 px-4 py-3">
            <Avatar size={40} />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[15px] font-semibold text-slate-900">Cóc Pass</div>
              <div className="text-xs text-slate-500">Hướng dẫn dùng FEPass</div>
            </div>
            {messages.length > 1 && (
              <button onClick={() => setMessages([GREETING])} aria-label="Bắt đầu lại" title="Bắt đầu lại" className="rounded-full p-2 text-slate-400 transition hover:bg-amber-100 hover:text-slate-700">
                <RotateCcw size={15} />
              </button>
            )}
            <button
              onClick={() => {
                acRef.current?.abort();
                setOpen(false);
              }}
              aria-label="Đóng"
              className="rounded-full p-2 text-slate-400 transition hover:bg-amber-100 hover:text-slate-700"
            >
              <X size={17} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex flex-col items-end gap-1">
                  <div className={`max-w-[82%] whitespace-pre-wrap [overflow-wrap:anywhere] rounded-2xl rounded-br-md px-3.5 py-2 text-[14px] leading-relaxed text-on-primary ${m.failed ? "bg-primary/60" : "bg-primary"}`}>{m.content}</div>
                  {m.failed && (
                    <div className="flex max-w-[90%] items-center gap-1.5 text-[11px] text-rose-600">
                      <span className="min-w-0 text-right [overflow-wrap:anywhere]">{m.failed}</span>
                      <button onClick={() => retry(i)} disabled={busy} className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold ring-1 ring-rose-200 transition hover:bg-rose-50 disabled:opacity-50">
                        <RotateCcw size={11} /> Gửi lại
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div key={i} className="flex items-end gap-2">
                  <Avatar />
                  <div className={`max-w-[84%] break-words rounded-2xl rounded-bl-md px-3.5 py-2.5 text-[14px] leading-relaxed bg-amber-50 text-slate-800`}>
                    {m.content ? (
                      <Markdown>{m.content}</Markdown>
                    ) : (
                      <span aria-label="Đang trả lời" className="flex h-5 items-center gap-2">
                        <span className="flex items-center gap-1">
                          <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-500 [animation-delay:-0.3s]" />
                          <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-500 [animation-delay:-0.15s]" />
                          <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-500" />
                        </span>
                        {status && <span className="text-xs text-slate-500">{status}</span>}
                      </span>
                    )}
                  </div>
                </div>
              ),
            )}
            {showChips && (
              <div className="flex flex-col items-start gap-1.5 pl-9 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => void send(s)} className="rounded-full border border-amber-300 bg-surface-container-lowest px-3 py-1.5 text-left text-[13px] text-slate-700 transition hover:border-amber-400 hover:bg-amber-50">
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={onSubmit} className="border-t border-amber-100 bg-surface-container-lowest px-3 pb-2 pt-3">
            <div className="flex items-end gap-2 rounded-3xl border border-slate-200 bg-slate-50 py-1.5 pl-4 pr-1.5 transition focus-within:border-amber-400 focus-within:bg-surface-container-lowest">
              <textarea
                ref={inputRef}
                value={input}
                rows={1}
                maxLength={MAX_CHARS}
                disabled={busy}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="Nhắn cho Cóc Pass…"
                aria-label="Tin nhắn"
                className="max-h-28 min-h-[2rem] flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-5 text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Gửi"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-brand-900 transition hover:bg-amber-500 disabled:bg-slate-200 disabled:text-slate-400"
              >
                <ArrowUp size={17} strokeWidth={2.5} />
              </button>
            </div>
            <p className="mt-2 px-2 text-center text-[11px] leading-snug text-slate-400">Cóc Pass chỉ hướng dẫn cách dùng web, không giải bài và không thao tác thay bạn.</p>
          </form>
        </div>
      )}
    </>
  );
}

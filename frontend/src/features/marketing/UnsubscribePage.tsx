import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CircleCheck, CircleX, Loader2, MailX } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { Footer } from "@/shared/layout/Footer";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { MARKETING_TOPICS, marketingApi, type UnsubscribeMode } from "./marketing.api";

type State = { phase: "idle" } | { phase: "sending"; mode: UnsubscribeMode } | { phase: "done"; mode: UnsubscribeMode } | { phase: "error"; message: string };

// Mở từ liên kết trong thư gợi ý. Chỉ huỷ khi người dùng bấm nút (không tự gửi lúc mở trang),
// để trình quét thư tự mở liên kết không huỷ thay người dùng. Không cần đăng nhập.
export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("t");
  const fromMail = MARKETING_TOPICS.find((t) => t.key === params.get("c")); // loại thư của thư đã mở; thư cũ không có
  const [picked, setPicked] = useState<(typeof MARKETING_TOPICS)[number]>();
  const topic = picked ?? fromMail;
  const [state, setState] = useState<State>(token ? { phase: "idle" } : { phase: "error", message: "Liên kết không hợp lệ" });

  const submit = async (mode: UnsubscribeMode, chosen = topic) => {
    if (!token) return;
    if (mode === "topic") setPicked(chosen);
    setState({ phase: "sending", mode });
    try {
      await marketingApi.unsubscribe(token, mode, mode === "topic" ? chosen?.key : undefined);
      setState({ phase: "done", mode });
    } catch (err) {
      setState({ phase: "error", message: errorMessage(err, "Liên kết không hợp lệ") });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <Card className="w-full max-w-sm space-y-4 p-6 text-center">
          {state.phase === "done" ? (
            <>
              <CircleCheck size={40} className="mx-auto text-success" />
              <h1 className="md-title-large text-on-surface">{state.mode === "pause" ? "Đã tạm dừng 30 ngày" : state.mode === "topic" ? `Đã tắt "${topic?.label ?? "loại thư này"}"` : "Đã huỷ"}</h1>
              <p className="md-body-medium text-on-surface-variant">
                {state.mode === "pause"
                  ? "Thư nhắc hết hạn Pro vẫn được gửi. Bạn có thể bật lại trong trang Hồ sơ."
                  : state.mode === "topic"
                    ? "Bạn vẫn nhận các loại thư khác. Đổi lại trong trang Hồ sơ."
                    : "Bạn vẫn nhận các thư về tài khoản và giao dịch."}
              </p>
              <Link to="/" className={buttonClass({ variant: "primary", className: "w-full" })}>
                Về trang chủ
              </Link>
            </>
          ) : state.phase === "error" ? (
            <>
              <CircleX size={40} className="mx-auto text-error" />
              <h1 className="md-title-large text-on-surface">Không huỷ được</h1>
              <p className="md-body-medium text-on-surface-variant">{state.message}</p>
              <p className="md-body-small text-on-surface-variant">Bạn có thể tắt thư gợi ý trong trang Hồ sơ sau khi đăng nhập.</p>
              <Link to="/account/profile" className={buttonClass({ variant: "primary", className: "w-full" })}>
                Mở Hồ sơ
              </Link>
            </>
          ) : (
            <>
              <MailX size={40} className="mx-auto text-primary" />
              <h1 className="md-title-large text-on-surface">Huỷ nhận thư gợi ý</h1>
              <p className="md-body-medium text-on-surface-variant">Chọn cách bạn muốn. Thư về tài khoản và giao dịch vẫn được gửi.</p>
              <div className="space-y-2">
                <Button className="w-full" disabled={state.phase === "sending"} onClick={() => void submit("pause")}>
                  {state.phase === "sending" && state.mode === "pause" && <Loader2 size={16} className="animate-spin" />}
                  Tạm dừng 30 ngày
                </Button>
                {fromMail ? (
                  <Button className="w-full" disabled={state.phase === "sending"} onClick={() => void submit("topic", fromMail)}>
                    {state.phase === "sending" && state.mode === "topic" && <Loader2 size={16} className="animate-spin" />}
                    Chỉ tắt "{fromMail.label}"
                  </Button>
                ) : (
                  // Thư cũ không ghi loại thư: để người dùng tự chọn loại muốn tắt
                  <div className="space-y-2 rounded-m3-lg border border-outline-variant p-3">
                    <p className="md-label-large text-on-surface">Hoặc chỉ tắt một loại</p>
                    {MARKETING_TOPICS.map((t) => (
                      <Button key={t.key} size="sm" className="w-full" disabled={state.phase === "sending"} onClick={() => void submit("topic", t)}>
                        {t.label}
                      </Button>
                    ))}
                  </div>
                )}
                <Button variant="danger" className="w-full" disabled={state.phase === "sending"} onClick={() => void submit("all")}>
                  {state.phase === "sending" && state.mode === "all" && <Loader2 size={16} className="animate-spin" />}
                  Huỷ tất cả thư gợi ý
                </Button>
              </div>
              <p className="md-body-small text-on-surface-variant">Khi tạm dừng, thư nhắc hết hạn Pro vẫn được gửi.</p>
            </>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
}

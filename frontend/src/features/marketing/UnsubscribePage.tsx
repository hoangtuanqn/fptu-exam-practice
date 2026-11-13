import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CircleCheck, CircleX, Loader2, MailX } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { Footer } from "@/shared/layout/Footer";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { marketingApi } from "./marketing.api";

type State = { phase: "idle" | "sending" | "done" } | { phase: "error"; message: string };

// Mở từ liên kết trong thư gợi ý. Chỉ huỷ khi người dùng bấm nút (không tự gửi lúc mở trang),
// để trình quét thư tự mở liên kết không huỷ thay người dùng. Không cần đăng nhập.
export default function UnsubscribePage() {
  const token = useSearchParams()[0].get("t");
  const [state, setState] = useState<State>(token ? { phase: "idle" } : { phase: "error", message: "Liên kết không hợp lệ" });

  const submit = async () => {
    if (!token) return;
    setState({ phase: "sending" });
    try {
      await marketingApi.unsubscribe(token);
      setState({ phase: "done" });
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
              <h1 className="md-title-large text-on-surface">Đã huỷ</h1>
              <p className="md-body-medium text-on-surface-variant">Bạn vẫn nhận các thư về tài khoản và giao dịch.</p>
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
              <p className="md-body-medium text-on-surface-variant">Bạn sẽ không nhận thư gợi ý ôn tập và ưu đãi nữa. Thư về tài khoản và giao dịch vẫn được gửi.</p>
              <Button variant="primary" className="w-full" disabled={state.phase === "sending"} onClick={() => void submit()}>
                {state.phase === "sending" && <Loader2 size={16} className="animate-spin" />}
                Xác nhận huỷ
              </Button>
            </>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
}

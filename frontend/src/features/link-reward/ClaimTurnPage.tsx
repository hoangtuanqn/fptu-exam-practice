import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CircleAlert, CheckCircle2, Loader2 } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { ApiError } from "@/shared/api/client";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { linkRewardApi, type ClaimResult } from "./link-reward.api";

type State = { kind: "loading" } | { kind: "done"; result: ClaimResult } | { kind: "error"; message: string; retry: boolean };

const dayMonth = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

// Trang đích sau khi vượt link xong (địa chỉ có ?t=<mã>): nhận lượt giải thích miễn phí
export default function ClaimTurnPage() {
  const [params] = useSearchParams();
  const token = params.get("t") ?? "";
  const [state, setState] = useState<State>({ kind: "loading" });
  const started = useRef(false);

  const claim = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      setState({ kind: "done", result: await linkRewardApi.claim(token) });
    } catch (err) {
      // Quá nhanh (429) hoặc dịch vụ bận: cho thử lại. Mã sai, hết hạn, đã đủ lượt: không thử lại được.
      const retry = err instanceof ApiError && (err.status === 429 || err.status >= 500);
      setState({ kind: "error", message: errorMessage(err, "Chưa nhận được lượt, vui lòng thử lại"), retry });
    }
  }, [token]);

  useEffect(() => {
    if (started.current) return; // chế độ dev chạy effect hai lần: chỉ nhận một lần
    started.current = true;
    if (!token) setState({ kind: "error", message: "Thiếu mã nhận lượt. Hãy bấm lại nút vượt link trong FePass.", retry: false });
    else void claim();
  }, [token, claim]);

  return (
    <Card className="mx-auto max-w-lg p-6 text-center">
      {state.kind === "loading" && (
        <div role="status" className="flex flex-col items-center gap-3 py-6">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="md-title-medium text-on-surface">Đang nhận lượt giải thích…</p>
        </div>
      )}

      {state.kind === "done" && (
        <div className="flex flex-col items-center gap-3 py-2">
          <CheckCircle2 size={44} className="text-success" />
          <h1 className="md-headline-small text-on-surface">{state.result.granted ? `Đã nhận ${state.result.turns} lượt giải thích miễn phí` : "Bạn đã nhận lượt từ liên kết này rồi"}</h1>
          <p className="md-body-large text-on-surface-variant">
            Bạn đang có <b>{state.result.available}</b> lượt
            {state.result.nextExpiresAt ? `, sớm nhất hết hạn ngày ${dayMonth(state.result.nextExpiresAt)}` : ""}.
            {state.result.enabled && state.result.remainingToday > 0 ? ` Hôm nay còn nhận thêm được ${state.result.remainingToday} lần.` : ""}
          </p>
          <p className="md-body-medium text-on-surface-variant">Quay lại câu bạn đang xem, bấm giải thích rồi chọn “Dùng 1 lượt miễn phí”.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Link to="/account/exams" className={buttonClass({ variant: "primary" })}>
              Về Kho đề
            </Link>
            <Button onClick={() => window.close()}>Đóng tab này</Button>
          </div>
        </div>
      )}

      {state.kind === "error" && (
        <div role="alert" className="flex flex-col items-center gap-3 py-2">
          <CircleAlert size={44} className="text-error" />
          <h1 className="md-headline-small text-on-surface">Chưa nhận được lượt</h1>
          <p className="md-body-large text-on-surface-variant">{state.message}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {state.retry && (
              <Button variant="primary" onClick={() => void claim()}>
                Thử lại
              </Button>
            )}
            <Link to="/account/exams" className={buttonClass({})}>
              Về Kho đề
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}

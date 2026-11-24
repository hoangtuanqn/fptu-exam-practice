import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Crown, Loader2, Lock, Unlock } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { examApi } from "@/features/exam/exam.api";
import { useTrialUnlock } from "@/features/exam-store/TrialLockBanner";
import { DAYS_PER_MONTH, vnd } from "@/features/plan/pro/money";
import { usePlanPrices } from "@/features/plan/semesterPromo";
import type { Question } from "@/features/practice/types";
import { useApi } from "@/shared/hooks/useApi";
import { Button, buttonClass } from "@/shared/ui/Button";
import { formatCredit } from "@/shared/utils/formatters";
import { isPro } from "@/shared/utils/pro";
import { trackShownOncePerSession } from "@/shared/utils/promptSnooze";
import { trackPrompt } from "@/shared/utils/trackPrompt";

const SHOW_ATTEMPTS_FROM = 10; // số lượt làm thật chỉ hiện khi đủ lớn

interface Props {
  examId: string;
  number: number; // số thứ tự của câu khoá
  total: number; // tổng số câu thật của đề
  attempts: number; // số lượt đã làm đề (đếm thật), 0 = không rõ
  onUnlocked: (all: Question[], total: number) => void;
  onBack: () => void;
}

// Câu chưa mở của đề xem thử: khung giả (không có ảnh thật nào được gửi về) phủ mờ + ổ khoá, mời mua đề hoặc dùng Pro
export function LockedQuestionCard({ examId, number, total, attempts, onUnlocked, onBack }: Props) {
  const { user } = useAuth();
  const quote = useApi(() => examApi.quote(examId), [examId]);
  const { start, busy, dialog } = useTrialUnlock(examId, onUnlocked);
  const proPrice = usePlanPrices();
  const fee = quote.data?.fee ?? 0;
  const pro = isPro(user);
  // Đề lẻ đã gần bằng một phần ba giá Pro thì Pro là lựa chọn lợi hơn: nút Pro nổi bật; ngược lại nút mua đề
  const proFirst = !pro && proPrice.pro !== null && fee * 3 >= proPrice.pro;
  const perDay = proPrice.pro !== null && proPrice.months ? Math.round(proPrice.pro / (proPrice.months * DAYS_PER_MONTH)) : null;
  useEffect(() => trackShownOncePerSession("trial-locked"), []);

  const buyBtn = (
    <Button
      autoFocus={!proFirst}
      variant={proFirst ? "tonal" : "primary"}
      disabled={busy || quote.loading}
      onClick={() => {
        trackPrompt("trial-locked", "click");
        start();
      }}
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
      {fee > 0 ? `Mua đề này · ${formatCredit(fee)}` : "Mở khoá đề"}
    </Button>
  );
  const proBtn = !pro && (
    <Link to="/pro" onClick={() => trackPrompt("trial-locked", "click")} autoFocus={proFirst} className={buttonClass({ variant: proFirst ? "primary" : "tonal" })}>
      <Crown size={16} /> Nâng cấp Pro
    </Link>
  );

  return (
    <section aria-label={`Câu ${number} đang khoá`} className="relative flex min-h-[360px] w-full flex-1 animate-fade-in flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm sm:min-h-[480px]">
      {/* Khung giả: thanh chữ và bốn đáp án xám, chỉ để gợi hình dáng một câu hỏi */}
      <div aria-hidden className="flex flex-1 animate-pulse flex-col gap-3 p-5 opacity-60 blur-[2px] sm:p-8">
        <div className="h-4 w-1/4 rounded bg-surface-container-high" />
        <div className="h-3 w-full rounded bg-surface-container-high" />
        <div className="h-3 w-11/12 rounded bg-surface-container-high" />
        <div className="h-3 w-3/4 rounded bg-surface-container-high" />
        <div className="mt-4 grid gap-3">
          {["A", "B", "C", "D"].map((o) => (
            <div key={o} className="h-10 rounded-m3-md bg-surface-container-high" />
          ))}
        </div>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-surface/70 px-4 py-6 text-center backdrop-blur-[2px]">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
          <Lock size={26} aria-hidden />
        </span>
        <h2 className="md-title-large text-on-surface" aria-live="polite">
          Câu {number} / {total} đang khoá
        </h2>
        <p className="md-body-medium max-w-md text-on-surface-variant">Mở khoá để làm tiếp, xem giải thích từng câu và lưu điểm. Bài làm thử hiện tại không được lưu.</p>
        {attempts >= SHOW_ATTEMPTS_FROM && <p className="md-label-large text-on-surface-variant">Đề này đã có {attempts.toLocaleString("vi-VN")} lượt làm</p>}
        <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
          {proFirst ? (
            <>
              {proBtn}
              {buyBtn}
            </>
          ) : (
            <>
              {buyBtn}
              {proBtn}
            </>
          )}
        </div>
        {!pro && proPrice.pro !== null && proPrice.months && (
          <p className="md-body-small text-on-surface-variant">
            Pro {proPrice.months} tháng · {vnd(proPrice.pro)}
            {perDay ? ` (khoảng ${vnd(perDay)}/ngày)` : ""}, mở mọi đề.
          </p>
        )}
        <p className="md-label-medium text-on-surface-variant">Trả một lần, không tự gia hạn. Bạn thấy giá trước khi bị trừ credit.</p>
        <Button
          size="sm"
          variant="text"
          onClick={() => {
            trackPrompt("trial-locked", "dismiss");
            onBack();
          }}
        >
          <ChevronLeft size={15} /> Quay lại câu trước
        </Button>
      </div>
      {dialog}
    </section>
  );
}

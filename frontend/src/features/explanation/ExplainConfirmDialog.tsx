import { Link, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { VerifyEmailNotice } from "@/features/verify-email/VerifyEmailNotice";
import { Button, buttonClass } from "@/shared/ui/Button";
import { ChargeSummary } from "@/shared/ui/ChargeSummary";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { formatCredit } from "@/shared/utils/formatters";
import { EarnTurnBlock } from "@/features/link-reward/EarnTurnBlock";
import type { FreeTurnStatus } from "@/features/link-reward/link-reward.api";
import { depositLink } from "./depositLink";
import type { ExplanationBundle } from "./explanation.api";

interface Props {
  questionNumber: number;
  price: number;
  bundle?: ExplanationBundle; // có thì mời mở khóa cả đề (rẻ hơn mua lẻ)
  onBundle?: () => void;
  freeTurns?: FreeTurnStatus; // lượt miễn phí nhận từ vượt link
  onUseFreeTurn?: () => void;
  onFreeTurnsChange?: () => void; // số lượt vừa đổi (vừa nhận thêm): nạp lại
  onCancel: () => void;
  onConfirm: () => void;
}

// Xác nhận phí trước khi xem lời giải thích AI (chỉ hỏi lần đầu của mỗi câu; mua rồi thì xem lại miễn phí)
export function ExplainConfirmDialog({ questionNumber, price, bundle, onBundle, freeTurns, onUseFreeTurn, onFreeTurnsChange, onCancel, onConfirm }: Props) {
  const { user } = useAuth();
  const location = useLocation();
  const balance = user?.balance ?? 0;
  const unverified = !!user && !user.emailVerifiedAt;
  const short = balance < price;

  return (
    <Modal onClose={onCancel}>
      <ModalTitle icon={Sparkles}>Giải thích câu {questionNumber}</ModalTitle>
      {unverified ? (
        <div className="mt-3">
          <VerifyEmailNotice variant="inline" message="Bạn cần xác minh email trước khi dùng giải thích AI." />
          <ModalActions>
            <Button onClick={onCancel}>Đóng</Button>
          </ModalActions>
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">AI sẽ giải thích vì sao đáp án đúng và vì sao các lựa chọn còn lại sai. Mỗi câu chỉ trả một lần, xem lại miễn phí.</p>
          <div className="mt-4">
            <ChargeSummary amount={price} balance={balance} />
          </div>
          {freeTurns && <EarnTurnBlock status={freeTurns} onUse={onUseFreeTurn} onChange={() => onFreeTurnsChange?.()} />}
          {bundle && onBundle && bundle.price > 0 && bundle.remaining > 1 && (
            <button
              onClick={onBundle}
              className="promo-shine mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-surface-container-lowest px-3.5 py-2.5 text-left transition hover:border-amber-400"
            >
              <span className="text-sm text-amber-950">
                <span className="font-semibold">Mở khóa cả đề {formatCredit(bundle.price)}</span>
                <span className="block text-xs text-amber-800">{bundle.remaining} câu, xem mãi mãi · rẻ hơn {bundle.discountPercent}%</span>
              </span>
              <span className="shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">-{bundle.discountPercent}%</span>
            </button>
          )}
          <ModalActions>
            <Button grow onClick={onCancel}>
              Hủy
            </Button>
            {short ? (
              <Link to={depositLink(price - balance, location.pathname)} className={buttonClass({ variant: "primary", grow: true })}>
                Nạp thêm {formatCredit(price - balance)}
              </Link>
            ) : (
              <Button grow variant="primary" onClick={onConfirm}>
                <Sparkles size={16} /> Trả {formatCredit(price)}
              </Button>
            )}
          </ModalActions>
        </>
      )}
    </Modal>
  );
}

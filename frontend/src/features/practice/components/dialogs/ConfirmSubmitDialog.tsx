import { AlertTriangle, Info } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";

interface Props {
  answered: number;
  total: number;
  answersPending: boolean; // AI chưa phân tích xong đáp án
  savable: boolean; // đề của hệ thống (lưu được lịch sử) hay đề mở từ thư mục
  flagged: number[]; // số câu đã đánh dấu phân vân
  unanswered: number[]; // số câu chưa trả lời
  onJump: (number: number) => void; // đóng hộp thoại và nhảy tới câu đó
  onCancel: () => void;
  onConfirm: () => void;
}

// Hàng số câu bấm được để quay lại xem trước khi nộp (hiện tối đa 15 số, còn lại ghi "+N")
function JumpList({ label, numbers, tone, onJump }: { label: string; numbers: number[]; tone: "amber" | "slate"; onJump: (n: number) => void }) {
  if (numbers.length === 0) return null;
  const shown = numbers.slice(0, 15);
  const chip = tone === "amber" ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100";
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-slate-500">
        {label} ({numbers.length})
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {shown.map((n) => (
          <button key={n} type="button" onClick={() => onJump(n)} aria-label={`Đến câu ${n}`} className={`h-8 min-w-8 rounded-lg border px-2 text-xs font-semibold tabular-nums ${chip}`}>
            {n}
          </button>
        ))}
        {numbers.length > shown.length && <span className="self-center text-xs text-slate-500">+{numbers.length - shown.length}</span>}
      </div>
    </div>
  );
}

// Xác nhận trước khi nộp bài
export function ConfirmSubmitDialog({ answered, total, savable, answersPending, flagged, unanswered, onJump, onCancel, onConfirm }: Props) {
  const { user } = useAuth();
  const left = total - answered;

  return (
    <Modal onClose={onCancel}>
      <ModalTitle icon={AlertTriangle}>Nộp bài?</ModalTitle>
      <p className="mt-4 text-sm text-slate-600">
        Bạn đã làm <b className="text-slate-900">{answered}</b> / {total} câu.
        {left > 0 ? (
          <>
            {" "}
            Còn <b className="text-slate-900">{left}</b> câu chưa trả lời, những câu này sẽ không được tính điểm.
          </>
        ) : (
          " Bạn đã trả lời tất cả các câu."
        )}
      </p>
      <JumpList label="Đã đánh dấu phân vân" tone="amber" numbers={flagged} onJump={onJump} />
      <JumpList label="Chưa trả lời" tone="slate" numbers={unanswered} onJump={onJump} />
      {answersPending && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-brand-50 px-3 py-2.5 text-xs leading-relaxed text-brand-900">
          <Info size={14} className="mt-0.5 shrink-0 text-brand-700" />
          Đáp án vẫn đang được chuẩn bị. Bạn vẫn nộp được, điểm sẽ hiện ngay khi đáp án sẵn sàng.
        </p>
      )}
      {!user && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
          <Info size={14} className="mt-0.5 shrink-0 text-brand-700" />
          {savable
            ? "Bạn chưa đăng nhập. Sau khi nộp, hãy đăng ký hoặc đăng nhập để bài này được lưu vào lịch sử."
            : "Đề mở từ thư mục trên máy không được lưu lịch sử. Hãy lấy đề từ link FuOverflow để lưu lại kết quả."}
        </p>
      )}
      <ModalActions>
        <Button grow onClick={onCancel}>
          Tiếp tục làm
        </Button>
        <Button grow variant="primary" onClick={onConfirm}>
          Nộp bài
        </Button>
      </ModalActions>
    </Modal>
  );
}

import { useState } from "react";
import { Check, FileText, Play } from "lucide-react";
import type { Mode } from "@/features/practice/types.ts";
import { MODES } from "@/features/practice/config/modes";
import { TIME_LIMIT_OPTIONS } from "@/features/practice/utils/timeLimit";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions } from "@/shared/ui/Modal";

interface Props {
  title: string;
  total: number; // tổng số câu (ảnh)
  graded: number; // số câu có đáp án
  answersPending: boolean; // AI đang phân tích đáp án
  replacing: boolean; // đang có bài làm dở sẽ bị thay thế
  onCancel: () => void;
  onStart: (mode: Mode, limitMin: number | null) => void;
}

// Hộp thoại sau khi upload đề: xác nhận + chọn chế độ (không đổi được giữa chừng).
// Chọn chế độ là nhóm radio (role=radiogroup), chọn thời gian là các filter chip.
export function StartDialog({ title, total, graded, answersPending, replacing, onCancel, onStart }: Props) {
  const [mode, setMode] = useState<Mode>("practice");
  const [limit, setLimit] = useState<number>(0); // phút; 0 = không giới hạn (chỉ dùng ở chế độ Thi)

  return (
    <Modal onClose={onCancel}>
      <h2 className="md-headline-small text-on-surface">Bắt đầu làm đề</h2>

      <div className="mt-4 rounded-m3-md bg-surface-container-highest px-4 py-3">
        <div className="md-title-small flex items-center gap-2 text-on-surface">
          <FileText size={18} className="shrink-0 text-on-surface-variant" />
          <span className="truncate">{title || "Đề chưa đặt tên"}</span>
        </div>
        <div className="md-body-medium mt-1 text-on-surface-variant">
          {total} câu hỏi{answersPending ? " · đang chuẩn bị đáp án" : ` · ${graded} câu có đáp án`}
        </div>
      </div>

      {answersPending && <p className="md-body-medium mt-3 text-primary">Đề chưa có đáp án nên bạn chỉ xem được. Phần làm bài sẽ mở khi đáp án sẵn sàng, thường sau ít phút.</p>}
      {replacing && <p className="md-body-medium mt-3 text-error">Bài đang làm dở sẽ bị thay thế bằng đề mới này.</p>}

      <div className="md-label-large mt-5 text-on-surface-variant">Chọn chế độ</div>
      <div role="radiogroup" aria-label="Chế độ làm bài" className="mt-2 space-y-2">
        {MODES.map(({ value, label, desc, Icon }) => {
          const on = mode === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setMode(value)}
              className={`md-state md-motion flex min-h-14 w-full items-start gap-3 rounded-m3-md border p-3 text-left ${on ? "border-primary bg-primary-container text-on-primary-container" : "border-outline-variant text-on-surface"}`}
            >
              <Icon size={22} className="mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="md-title-small">{label}</div>
                <div className="md-body-medium opacity-90">{desc}</div>
              </div>
              <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-primary" : "border-outline"}`}>
                {on && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </span>
            </button>
          );
        })}
      </div>
      {mode === "exam" && (
        <div className="mt-4">
          <div className="md-label-large text-on-surface-variant">Thời gian làm bài</div>
          <div role="group" aria-label="Thời gian làm bài" className="mt-2 flex flex-wrap gap-2">
            {TIME_LIMIT_OPTIONS.map((m) => {
              const on = limit === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setLimit(m)}
                  aria-pressed={on}
                  className={`md-state md-motion md-label-large relative inline-flex h-8 items-center gap-1.5 rounded-m3-sm border px-3 after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] ${
                    on ? "border-transparent bg-secondary-container text-on-secondary-container" : "border-outline text-on-surface-variant"
                  }`}
                >
                  {on && <Check size={16} />}
                  {m === 0 ? "Không giới hạn" : `${m} phút`}
                </button>
              );
            })}
          </div>
          <p className="md-body-small mt-1.5 text-on-surface-variant">{limit > 0 ? "Hết giờ, bài sẽ được tự nộp và chấm điểm." : "Đồng hồ chỉ để bạn theo dõi thời gian làm bài."}</p>
        </div>
      )}
      <p className="md-body-small mt-3 text-on-surface-variant">Không đổi được chế độ khi đang làm bài.</p>

      <ModalActions>
        <Button variant="text" onClick={onCancel}>
          Hủy
        </Button>
        <Button variant="filled" onClick={() => onStart(mode, mode === "exam" && limit > 0 ? limit : null)}>
          <Play size={18} />
          <span className="sm:hidden">Bắt đầu</span>
          <span className="hidden sm:inline">Bắt đầu làm bài</span>
        </Button>
      </ModalActions>
    </Modal>
  );
}

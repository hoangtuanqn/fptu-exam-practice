import { Fragment, useState } from "react";
import { Check, FileText, Play } from "lucide-react";
import type { Mode } from "@/features/practice/types.ts";
import { MODES } from "@/features/practice/config/modes";
import { TIME_LIMIT_MAX, TIME_LIMIT_MIN, TIME_LIMIT_OPTIONS } from "@/features/practice/utils/timeLimit";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions } from "@/shared/ui/Modal";

const CHIP_ON = "border-transparent bg-secondary-container text-on-secondary-container";
const CHIP_OFF = "border-outline text-on-surface-variant";

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
  const [mode, setMode] = useState<Mode | null>(null); // chưa chọn thì chưa cho bắt đầu
  const [limit, setLimit] = useState<number>(TIME_LIMIT_OPTIONS[0]); // phút; mặc định 90, 0 = không giới hạn (chỉ dùng ở chế độ Thi)
  const [custom, setCustom] = useState(false); // chọn "Khác": người dùng tự nhập số phút
  const [customText, setCustomText] = useState("");
  const customMin = Number(customText);
  const customValid = Number.isInteger(customMin) && customMin >= TIME_LIMIT_MIN && customMin <= TIME_LIMIT_MAX;
  const effectiveLimit = mode !== "exam" ? 0 : custom ? (customValid ? customMin : 0) : limit;
  const blocked = mode === null || (mode === "exam" && custom && !customValid); // chưa chọn chế độ, hoặc chọn "Khác" mà chưa nhập số hợp lệ

  return (
    <Modal onClose={onCancel} light>
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
              const on = !custom && limit === m;
              return (
                <Fragment key={m}>
                  {/* "Khác" đứng trước "Không giới hạn" */}
                  {m === 0 && (
                    <button type="button" onClick={() => setCustom(true)} aria-pressed={custom} className={`md-state md-motion md-label-large relative inline-flex h-8 items-center gap-1.5 rounded-m3-sm border px-3 after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] ${custom ? CHIP_ON : CHIP_OFF}`}>
                      {custom && <Check size={16} />}
                      Khác
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCustom(false);
                      setLimit(m);
                    }}
                    aria-pressed={on}
                    className={`md-state md-motion md-label-large relative inline-flex h-8 items-center gap-1.5 rounded-m3-sm border px-3 after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] ${on ? CHIP_ON : CHIP_OFF}`}
                  >
                    {on && <Check size={16} />}
                    {m === 0 ? "Không giới hạn" : `${m} phút`}
                  </button>
                </Fragment>
              );
            })}
          </div>
          {custom && (
            <label className="mt-2.5 flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={customText}
                onChange={(e) => setCustomText(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="Ví dụ: 75"
                aria-label="Số phút làm bài"
                aria-invalid={customText !== "" && !customValid}
                className="md-body-large h-10 w-28 rounded-m3-sm border border-outline bg-transparent px-3 text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <span className="md-body-medium text-on-surface-variant">phút</span>
            </label>
          )}
          {custom && customText !== "" && !customValid && (
            <p className="md-body-small mt-1.5 text-error">Nhập số phút từ {TIME_LIMIT_MIN} đến {TIME_LIMIT_MAX}.</p>
          )}
          <p className="md-body-small mt-1.5 text-on-surface-variant">{effectiveLimit > 0 ? "Hết giờ, bài sẽ được tự nộp và chấm điểm." : "Đồng hồ chỉ để bạn theo dõi thời gian làm bài."}</p>
        </div>
      )}
      <p className="md-body-small mt-3 text-on-surface-variant">{mode === null ? "Chọn một chế độ để bắt đầu. Đóng hộp thoại để quay lại." : "Không đổi được chế độ khi đang làm bài."}</p>

      <ModalActions>
        <Button variant="text" onClick={onCancel}>
          Hủy
        </Button>
        <Button variant="filled" disabled={blocked} onClick={() => mode && onStart(mode, effectiveLimit > 0 ? effectiveLimit : null)}>
          <Play size={18} />
          <span className="sm:hidden">Bắt đầu</span>
          <span className="hidden sm:inline">Bắt đầu làm bài</span>
        </Button>
      </ModalActions>
    </Modal>
  );
}

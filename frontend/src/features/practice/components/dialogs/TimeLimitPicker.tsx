import { Fragment } from "react";
import { Check } from "lucide-react";
import { canFullscreen } from "@/features/practice/hooks/useExamGuard";
import { TIME_LIMIT_MAX, TIME_LIMIT_MIN, TIME_LIMIT_OPTIONS } from "@/features/practice/utils/timeLimit";

const CHIP_ON = "border-transparent bg-secondary-container text-on-secondary-container";
const CHIP_OFF = "border-outline text-on-surface-variant";
const CHIP = "md-state md-motion md-label-large relative inline-flex h-8 items-center gap-1.5 rounded-m3-sm border px-3 after:absolute after:-inset-y-2 after:inset-x-0 after:content-['']";

export interface TimeLimitState {
  limit: number; // phút của chip đang chọn, 0 = không giới hạn
  custom: boolean; // chọn "Khác": người dùng tự nhập số phút
  customText: string;
}

export const DEFAULT_TIME_LIMIT: TimeLimitState = { limit: TIME_LIMIT_OPTIONS[0], custom: false, customText: "" }; // mặc định 90 phút

// Số phút đã chọn (0 = không giới hạn) và đã hợp lệ chưa (chọn "Khác" mà chưa nhập đúng số thì chưa)
export function resolveTimeLimit(s: TimeLimitState) {
  const customMin = Number(s.customText);
  const customValid = Number.isInteger(customMin) && customMin >= TIME_LIMIT_MIN && customMin <= TIME_LIMIT_MAX;
  return { minutes: s.custom ? (customValid ? customMin : 0) : s.limit, valid: !s.custom || customValid };
}

// Chọn thời gian làm bài của chế độ Thi: các filter chip 90/60/Khác/Không giới hạn
export function TimeLimitPicker({ value, onChange }: { value: TimeLimitState; onChange: (v: TimeLimitState) => void }) {
  const { custom, customText, limit } = value;
  const { minutes, valid } = resolveTimeLimit(value);
  return (
    <div className="mt-4">
      <div className="md-label-large text-on-surface-variant">Thời gian làm bài</div>
      <div role="group" aria-label="Thời gian làm bài" className="mt-2 flex flex-wrap gap-2">
        {TIME_LIMIT_OPTIONS.map((m) => {
          const on = !custom && limit === m;
          return (
            <Fragment key={m}>
              {/* "Khác" đứng trước "Không giới hạn" */}
              {m === 0 && (
                <button type="button" onClick={() => onChange({ ...value, custom: true })} aria-pressed={custom} className={`${CHIP} ${custom ? CHIP_ON : CHIP_OFF}`}>
                  {custom && <Check size={16} />}
                  Khác
                </button>
              )}
              <button type="button" onClick={() => onChange({ ...value, custom: false, limit: m })} aria-pressed={on} className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}>
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
            onChange={(e) => onChange({ ...value, customText: e.target.value.replace(/\D/g, "").slice(0, 3) })}
            placeholder="Ví dụ: 75"
            aria-label="Số phút làm bài"
            aria-invalid={customText !== "" && !valid}
            className="md-body-large h-10 w-28 rounded-m3-sm border border-outline bg-transparent px-3 text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <span className="md-body-medium text-on-surface-variant">phút</span>
        </label>
      )}
      {custom && customText !== "" && !valid && (
        <p className="md-body-small mt-1.5 text-error">Nhập số phút từ {TIME_LIMIT_MIN} đến {TIME_LIMIT_MAX}.</p>
      )}
      <p className="md-body-small mt-1.5 text-on-surface-variant">{minutes > 0 ? "Hết giờ, bài sẽ được tự nộp và chấm điểm." : "Đồng hồ chỉ để bạn theo dõi thời gian làm bài."}</p>
      {canFullscreen && <p className="md-body-small mt-1.5 text-on-surface-variant">Bài thi chạy toàn màn hình. Rời khỏi màn hình (Esc, chuyển tab) sẽ bị ghi 1 lượt vi phạm, thi thử nên không giới hạn số lần.</p>}
    </div>
  );
}

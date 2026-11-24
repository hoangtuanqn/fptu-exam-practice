import { useState } from "react";

// Gõ số câu rồi Enter để nhảy thẳng tới câu đó (bộ nhiều câu, bấm trong lưới rất xa)
export function JumpForm({ max, onJump }: { max: number; onJump: (index: number) => void }) {
  const [text, setText] = useState("");
  const n = Number(text);
  const valid = Number.isInteger(n) && n >= 1 && n <= max;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onJump(n - 1);
      }}
      className="flex items-center gap-2"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        placeholder={`Nhập số câu (1–${max}) rồi Enter`}
        aria-label="Nhảy tới câu số"
        className="md-body-medium min-w-0 flex-1 rounded-full border border-outline bg-surface px-4 py-2 text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
      <button type="submit" disabled={!valid} className="md-state md-label-large rounded-full bg-primary px-4 py-2 text-on-primary disabled:opacity-40">
        Đi
      </button>
    </form>
  );
}

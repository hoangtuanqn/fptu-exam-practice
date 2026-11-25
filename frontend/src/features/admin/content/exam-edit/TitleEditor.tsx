import { useState } from "react";
import { Check, Loader2, Pencil } from "lucide-react";
import { Button } from "@/shared/ui/Button";

// Tiêu đề đề thi, bấm bút chì để đổi tên. Lưu qua `onSave` của ExamInfo để dùng chung khoá với loại đề/môn học
export function TitleEditor({ title, disabled, onSave }: { title: string; disabled: boolean; onSave: (title: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);

  async function save() {
    const next = value.trim();
    if (!next || next === title) return setEditing(false);
    if (await onSave(next)) setEditing(false);
  }

  if (!editing) {
    return (
      <div className="group flex items-start gap-2">
        <h1 className="font-serif text-2xl font-semibold text-slate-900">{title}</h1>
        <button
          onClick={() => {
            setValue(title);
            setEditing(true);
          }}
          disabled={disabled}
          aria-label="Đổi tên đề"
          title="Đổi tên đề"
          className="mt-1 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        >
          <Pencil size={16} />
        </button>
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) void save();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input
        autoFocus
        value={value}
        maxLength={255}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        aria-label="Tiêu đề đề thi"
        className="min-w-64 flex-1 rounded-xl border border-slate-300 px-3 py-2 font-serif text-lg focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
      />
      <Button type="submit" variant="primary" size="sm" disabled={disabled || !value.trim()}>
        {disabled ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Lưu
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={disabled}>
        Huỷ
      </Button>
    </form>
  );
}

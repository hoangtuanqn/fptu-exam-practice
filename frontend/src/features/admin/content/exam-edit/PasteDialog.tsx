import { useMemo, useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { parsePasted } from "./answers";

export function PasteDialog({ numbers, onApply, onClose }: { numbers: number[]; onApply: (m: Map<number, string>) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => parsePasted(text, numbers), [text, numbers]);
  return (
    <Modal onClose={onClose}>
      <ModalTitle icon={ClipboardPaste}>Dán đáp án hàng loạt</ModalTitle>
      <p className="mt-2 text-sm text-slate-500">
        Dán theo số câu (<code className="rounded bg-slate-100 px-1">1A 2B 3C</code> hoặc <code className="rounded bg-slate-100 px-1">1. A C</code>), hoặc chỉ dán chuỗi đáp án lần lượt (<code className="rounded bg-slate-100 px-1">A B C D</code>). Nhiều đáp án một câu: <code className="rounded bg-slate-100 px-1">AC</code>.
      </p>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={"1A 2C 3B 4AD\nhoặc\nA C B AD ..."}
        className="mt-3 w-full rounded-xl border border-slate-200 p-3 font-mono text-sm shadow-soft focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
      />
      <p className="mt-2 text-sm text-slate-600">{text.trim() ? `Nhận diện được ${parsed.size} câu.` : "Chưa dán gì."}</p>
      <ModalActions>
        <Button grow onClick={onClose}>
          Huỷ
        </Button>
        <Button grow variant="primary" disabled={parsed.size === 0} onClick={() => onApply(parsed)}>
          Áp dụng {parsed.size > 0 && `(${parsed.size} câu)`}
        </Button>
      </ModalActions>
    </Modal>
  );
}

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/shared/context/ToastContext";

// Nút sao chép: đổi sang dấu tích 1,5 giây để người dùng biết đã chép
export function CopyButton({ text, label = "Sao chép" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const toast = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      toast.error("Trình duyệt không cho phép sao chép");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
    >
      {done ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
    </button>
  );
}

import type { ReactNode } from "react";
import { Bold, Code, EyeOff, Heading2, Italic, Link2, List, ListOrdered, Quote, SquareCode, Strikethrough, Table2 } from "lucide-react";
import type { Format } from "./format";

export const TOOL = "md-state inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-m3-sm text-on-surface-variant outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40";

const TOOLS: { format: Format; label: string; icon: typeof Bold }[] = [
  { format: "bold", label: "In đậm", icon: Bold },
  { format: "italic", label: "In nghiêng", icon: Italic },
  { format: "strike", label: "Gạch ngang", icon: Strikethrough },
  { format: "code", label: "Mã trong dòng", icon: Code },
  { format: "link", label: "Liên kết", icon: Link2 },
  { format: "heading", label: "Tiêu đề", icon: Heading2 },
  { format: "bullet", label: "Danh sách chấm", icon: List },
  { format: "number", label: "Danh sách số", icon: ListOrdered },
  { format: "quote", label: "Trích dẫn", icon: Quote },
  { format: "codeblock", label: "Khối mã", icon: SquareCode },
  { format: "spoiler", label: "Che nội dung", icon: EyeOff },
  { format: "table", label: "Bảng", icon: Table2 },
];

// Hàng nút định dạng trên ô viết; `children` = nút thêm của ô viết (ký hiệu toán, xem trước)
export function FormatToolbar({ onFormat, disabled, children }: { onFormat: (f: Format) => void; disabled?: boolean; children?: ReactNode }) {
  return (
    <div role="toolbar" aria-label="Định dạng chữ" className="flex flex-wrap items-center gap-0.5 rounded-t-m3-lg border-b border-outline-variant bg-surface-container-low px-1.5 py-1">
      {TOOLS.map(({ format, label, icon: Icon }) => (
        <button key={format} type="button" onClick={() => onFormat(format)} disabled={disabled} aria-label={label} title={label} className={TOOL}>
          <Icon size={17} />
        </button>
      ))}
      {children}
    </div>
  );
}

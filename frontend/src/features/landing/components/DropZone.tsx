import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { FolderInput, type PickFolder } from "@/features/practice/components/FolderInput";
import { readDroppedFolder } from "@/features/practice/utils/readDroppedFolder";
import { FOLDER_EXAMPLE } from "../content";

// Vùng kéo thả / chọn thư mục đề + ví dụ cấu trúc thư mục
export function DropZone({ onPick }: { onPick: PickFolder }) {
  const [dragging, setDragging] = useState(false);

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = await readDroppedFolder(e.dataTransfer);
    if (dropped) onPick(dropped.files, dropped.name);
  }

  return (
    <>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`mt-6 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-8 transition ${
          dragging ? "border-brand-600 bg-brand-50" : "border-brand-300 bg-brand-50/40 hover:border-brand-500"
        }`}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-accent text-white shadow-md shadow-brand-600/25">
          <FolderOpen size={20} />
        </span>
        <div className="mt-3 font-serif text-xl font-semibold text-slate-900">Mở thư mục đề</div>
        <div className="mt-0.5 text-sm text-slate-500">Kéo thả thư mục vào đây, hoặc bấm để chọn</div>
        <FolderInput onPick={onPick} />
      </label>

      <details className="mt-3 text-left text-sm">
        <summary className="cursor-pointer select-none text-center text-xs text-slate-500 hover:text-slate-800">
          Thư mục đề cần có cấu trúc thế nào?
        </summary>
        <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs leading-relaxed text-slate-600">
          {FOLDER_EXAMPLE}
        </pre>
      </details>
    </>
  );
}

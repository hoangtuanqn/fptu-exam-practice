import { useState } from "react";
import { FolderHeart } from "lucide-react";
import { FolderInput, type PickFolder } from "@/features/practice/components/FolderInput";
import { readDroppedFolder } from "@/features/practice/utils/readDroppedFolder";
import { GOLD_GLOSS } from "@/shared/ui/gold";
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
        className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-4 py-7 transition sm:px-6 sm:py-9 ${
          dragging ? "border-primary bg-primary-container/50" : "border-outline-variant bg-surface-container-low/60 hover:border-primary/60 hover:bg-primary-container/30"
        }`}
      >
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${GOLD_GLOSS}`}>
          <FolderHeart size={22} />
        </span>
        <div className="md-title-large mt-4 text-on-surface">Mở thư mục đề</div>
        <div className="md-body-medium mt-0.5 text-on-surface-variant">Kéo thả thư mục vào đây, hoặc bấm để chọn</div>
        <FolderInput onPick={onPick} />
      </label>

      <details open className="mt-3 pb-1 text-left text-sm">
        <summary className="cursor-pointer select-none text-center text-xs text-on-surface-variant hover:text-on-surface">
          Thư mục đề cần có cấu trúc thế nào?
        </summary>
        <pre className="mt-2 overflow-x-auto rounded-xl border border-outline-variant bg-surface-container px-4 py-3 font-mono text-xs leading-relaxed text-on-surface-variant">
          {FOLDER_EXAMPLE}
        </pre>
      </details>
    </>
  );
}

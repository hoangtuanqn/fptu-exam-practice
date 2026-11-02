import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { readDroppedFolder } from "../../utils/readDroppedFolder";
import { Footer } from "./Footer";
import { FolderInput, type PickFolder } from "./FolderInput";

// Trang chủ tối giản: một vùng thả thư mục + ví dụ cấu trúc thư mục
export function EmptyState({ onPick }: { onPick: PickFolder }) {
  const [dragging, setDragging] = useState(false);

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = await readDroppedFolder(e.dataTransfer);
    if (dropped) onPick(dropped.files, dropped.name);
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
              dragging
                ? "border-brand-700 bg-brand-50"
                : "border-slate-300 bg-white hover:border-brand-400 hover:bg-brand-50/40"
            }`}
          >
            <FolderOpen size={28} className="text-brand-700" />
            <div className="mt-4 font-serif text-2xl font-semibold text-slate-900">Mở thư mục đề</div>
            <div className="mt-1 text-sm text-slate-500">Kéo thả thư mục vào đây, hoặc bấm để chọn</div>
            <FolderInput onPick={onPick} />
          </label>

          <pre className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white px-5 py-4 font-mono text-[13px] leading-relaxed text-slate-600">
            {`ten-de/
├─ 1.webp      câu 1
├─ 2.webp      câu 2
└─ ans.txt     dòng N = đáp án câu N
               (nhiều đáp án: A C D)`}
          </pre>
        </div>
      </div>
      <Footer />
    </div>
  );
}

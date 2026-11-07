import { useRef, useState, type KeyboardEvent } from "react";
import { FolderOpen, Link2 } from "lucide-react";
import { MyExams } from "@/features/exam-library/MyExams";
import type { PickFolder } from "@/features/practice/components/FolderInput";
import { LinkImport } from "@/features/exam-import/components/LinkImport";
import type { ImportedExam } from "@/features/exam-import/types";
import { DropZone } from "./DropZone";

type Source = "link" | "folder";

const TABS: { id: Source; label: string; short: string; icon: typeof Link2 }[] = [
  { id: "link", label: "Dán link", short: "Dán link", icon: Link2 },
  { id: "folder", label: "Mở thư mục đề", short: "Mở thư mục", icon: FolderOpen },
];

interface Props {
  onPick: PickFolder;
  onImported: (exam: ImportedExam) => void;
}

// Hai cách vào đề: dán link FuOverflow (server crawl) hoặc mở thư mục có sẵn trên máy.
// Thẻ elevated của M3 + tab chính (primary tabs): vạch chỉ báo 3dp màu primary dưới tab đang chọn, ← → chuyển tab (mẫu ARIA tabs).
export function ExamSourcePicker({ onPick, onImported }: Props) {
  const [source, setSource] = useState<Source>("link");
  const [libraryKey, setLibraryKey] = useState(0); // đổi key để "Đề của tôi" tải lại sau khi nhập đề mới
  const tabs = useRef<Record<Source, HTMLButtonElement | null>>({ link: null, folder: null });

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next: Source = source === "link" ? "folder" : "link";
    setSource(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="mt-8">
      <div className="rounded-m3-xl bg-surface-container-low p-3 text-left shadow-m3-1 sm:p-4">
        <div role="tablist" aria-label="Cách nhập đề" onKeyDown={onKey} className="grid grid-cols-2 border-b border-outline-variant">
          {TABS.map(({ id, label, short, icon: Icon }) => {
            const on = source === id;
            return (
              <button
                key={id}
                ref={(el) => {
                  tabs.current[id] = el;
                }}
                role="tab"
                type="button"
                id={`source-tab-${id}`}
                aria-selected={on}
                aria-controls={`source-panel-${id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setSource(id)}
                className={`md-state md-motion md-title-small relative flex h-12 items-center justify-center gap-2 px-3 ${on ? "text-primary" : "text-on-surface-variant"}`}
              >
                <Icon size={18} />
                <span className="truncate">
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{label}</span>
                </span>
                <span aria-hidden className={`md-motion absolute inset-x-4 bottom-0 h-[3px] rounded-t-full bg-primary ${on ? "opacity-100" : "opacity-0"}`} />
              </button>
            );
          })}
        </div>

        {/* Giữ cả hai trong DOM (đang lấy đề mà đổi tab thì tiến trình không bị mất) và xếp chồng vào cùng một ô lưới:
            khung luôn cao bằng tab cao nhất nên đổi tab không làm các phần bên dưới nhảy lên xuống.
            Tab ẩn chỉ invisible (vẫn giữ chỗ, không focus được) chứ không dùng hidden. */}
        <div className="mt-3 grid">
          <div role="tabpanel" id="source-panel-link" aria-labelledby="source-tab-link" className={`[grid-area:1/1] ${source === "link" ? "" : "invisible"}`} aria-hidden={source !== "link"}>
            <LinkImport
              onImported={(exam) => {
                setLibraryKey((k) => k + 1);
                onImported(exam);
              }}
            />
          </div>
          <div role="tabpanel" id="source-panel-folder" aria-labelledby="source-tab-folder" className={`[grid-area:1/1] ${source === "folder" ? "" : "invisible"}`} aria-hidden={source !== "folder"}>
            <DropZone onPick={onPick} />
          </div>
        </div>
      </div>

      <MyExams key={libraryKey} onOpen={onImported} />
    </div>
  );
}

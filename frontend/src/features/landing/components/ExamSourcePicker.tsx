import { useRef, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpen, ClipboardPaste } from "lucide-react";
import { MyExams } from "@/features/exam-store/MyExams";
import type { PickFolder } from "@/features/practice/components/FolderInput";
import { LinkImport } from "@/features/exam-import/components/LinkImport";
import type { ImportedExam } from "@/features/exam-import/types";
import { PickExamTab } from "./PickExamTab";

type Source = "pick" | "link";

const TABS: { id: Source; no: string; label: string; short: string; icon: typeof BookOpen }[] = [
  { id: "pick", no: "01", label: "Chọn môn và đề", short: "Chọn đề", icon: BookOpen },
  { id: "link", no: "02", label: "Dán link FuOverflow", short: "Dán link", icon: ClipboardPaste },
];

interface Props {
  onPick?: PickFolder; // mở thư mục đề từ máy: đang tạm ẩn (DropZone vẫn còn trong mã), nên chưa dùng
  onImported: (exam: ImportedExam) => void;
}

// Hai cách vào đề: chọn môn rồi mở đề có sẵn (dành cho người chưa biết FuOverflow), hoặc dán link FuOverflow (server lấy đề).
// Thẻ elevated của M3 + tab chính (primary tabs): vạch chỉ báo 3dp màu primary dưới tab đang chọn, ← → chuyển tab (mẫu ARIA tabs).
export function ExamSourcePicker({ onImported }: Props) {
  const [params] = useSearchParams();
  // Vào từ tiện ích hoặc từ liên kết có sẵn link đề (?link=...) thì mở thẳng tab dán link
  const [source, setSource] = useState<Source>(params.get("link") || params.get("url") ? "link" : "pick");
  const [libraryKey, setLibraryKey] = useState(0); // đổi key để "Đề của tôi" tải lại sau khi nhập đề mới
  const tabs = useRef<Record<Source, HTMLButtonElement | null>>({ pick: null, link: null });

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next: Source = source === "pick" ? "link" : "pick";
    setSource(next);
    tabs.current[next]?.focus();
  };

  return (
    <div className="mt-8">
      <div className="relative rounded-m3-xl border border-outline-variant/70 bg-gradient-to-b from-surface-container-lowest to-surface-container-low p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.05),0_24px_50px_-24px_rgba(70,45,0,0.35)] sm:p-4">
        <span aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#ffc61f]/70 to-transparent" />
        <div role="tablist" aria-label="Cách vào đề" onKeyDown={onKey} className="grid grid-cols-2 border-b border-outline-variant">
          {TABS.map(({ id, no, label, short, icon: Icon }) => {
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
                <span aria-hidden className="text-xs tabular-nums opacity-60">
                  {no}
                </span>
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

        {/* Giữ cả hai trong DOM (đang lấy đề mà đổi tab thì tiến trình không bị mất), tab không chọn thì ẩn hẳn:
            hai tab cao thấp rất khác nhau nên không xếp chồng giữ chỗ như trước. */}
        <div className="mt-3">
          <div role="tabpanel" id="source-panel-pick" aria-labelledby="source-tab-pick" hidden={source !== "pick"}>
            <PickExamTab />
          </div>
          <div role="tabpanel" id="source-panel-link" aria-labelledby="source-tab-link" hidden={source !== "link"}>
            <LinkImport
              onImported={(exam) => {
                setLibraryKey((k) => k + 1);
                onImported(exam);
              }}
            />
          </div>
        </div>
      </div>

      <MyExams key={libraryKey} onOpen={onImported} />
    </div>
  );
}

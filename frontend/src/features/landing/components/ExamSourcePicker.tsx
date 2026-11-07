import { useState } from "react";
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

// Hai cách vào đề: dán link FuOverflow (server crawl) hoặc mở thư mục có sẵn trên máy
export function ExamSourcePicker({ onPick, onImported }: Props) {
  const [source, setSource] = useState<Source>("link");
  const [libraryKey, setLibraryKey] = useState(0); // đổi key để "Đề của tôi" tải lại sau khi nhập đề mới

  return (
    <div className="mt-8">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-3 text-left shadow-pop sm:p-4">
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100/80 p-1">
          {TABS.map(({ id, label, short, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={source === id}
              onClick={() => setSource(id)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                source === id ? "bg-white text-slate-900 shadow-soft" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon size={15} className={source === id ? "text-brand-700" : ""} />
              <span className="truncate">
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Giữ cả hai trong DOM (đang lấy đề mà đổi tab thì tiến trình không bị mất) và xếp chồng vào cùng một ô lưới:
            khung luôn cao bằng tab cao nhất nên đổi tab không làm các phần bên dưới nhảy lên xuống.
            Tab ẩn chỉ invisible (vẫn giữ chỗ, không focus được) chứ không dùng hidden. */}
        <div className="mt-3 grid">
          <div className={`[grid-area:1/1] ${source === "link" ? "" : "invisible"}`} aria-hidden={source !== "link"}>
            <LinkImport
              onImported={(exam) => {
                setLibraryKey((k) => k + 1);
                onImported(exam);
              }}
            />
          </div>
          <div className={`[grid-area:1/1] ${source === "folder" ? "" : "invisible"}`} aria-hidden={source !== "folder"}>
            <DropZone onPick={onPick} />
          </div>
        </div>
      </div>

      <MyExams key={libraryKey} onOpen={onImported} />
    </div>
  );
}

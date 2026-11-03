import { useState } from "react";
import { MyExams } from "@/features/exam-library/MyExams";
import { FolderOpen, Link2 } from "lucide-react";
import type { PickFolder } from "@/features/practice/components/FolderInput";
import { LinkImport } from "@/features/exam-import/components/LinkImport";
import type { ImportedExam } from "@/features/exam-import/types";
import { DropZone } from "./DropZone";

type Source = "link" | "folder";

const TABS: { id: Source; label: string; icon: typeof Link2 }[] = [
  { id: "link", label: "Nhập link FuOverflow", icon: Link2 },
  { id: "folder", label: "Mở thư mục đề", icon: FolderOpen },
];

interface Props {
  onPick: PickFolder;
  onImported: (exam: ImportedExam) => void;
  loggedIn: boolean; // khách mặc định ở tab thư mục (dùng thử), thành viên mặc định ở tab link
}

// Hai cách vào đề: dán link FuOverflow (server crawl) hoặc mở thư mục có sẵn trên máy
export function ExamSourcePicker({ onPick, onImported, loggedIn }: Props) {
  const [source, setSource] = useState<Source>(loggedIn ? "link" : "folder");
  const [libraryKey, setLibraryKey] = useState(0); // đổi key để "Đề của tôi" tải lại sau khi nhập đề mới

  return (
    <div className="mt-6">
      <div role="tablist" className="mx-auto flex w-fit rounded-xl border border-slate-200 bg-slate-50 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={source === id}
            onClick={() => setSource(id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              source === id ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Giữ cả hai trong DOM: đang lấy đề mà đổi tab thì tiến trình không bị mất */}
      <div hidden={source !== "link"}>
        <LinkImport
          onImported={(exam) => {
            setLibraryKey((k) => k + 1);
            onImported(exam);
          }}
        />
      </div>
      <div hidden={source !== "folder"}>
        <DropZone onPick={onPick} />
      </div>

      {loggedIn && <MyExams key={libraryKey} onOpen={onImported} />}
    </div>
  );
}

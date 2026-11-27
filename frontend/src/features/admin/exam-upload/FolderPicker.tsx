import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { FolderOpen } from "lucide-react";
import type { FolderEntry } from "./folder";
import { fromDrop, fromInput } from "./readFolder";

interface Props {
  onPick: (entries: FolderEntry<File>[]) => void;
  disabled?: boolean;
  error?: string;
}

// Chọn một thư mục đề: bấm để chọn hoặc kéo thả thư mục vào
export function FolderPicker({ onPick, disabled, error }: Props) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [readError, setReadError] = useState<string>();

  // React chưa có kiểu cho thuộc tính webkitdirectory nên gắn thẳng vào thẻ
  useEffect(() => {
    input.current?.setAttribute("webkitdirectory", "");
  }, []);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    setReadError(undefined);
    fromDrop(e.dataTransfer).then(onPick, () => setReadError("Không đọc được thư mục, hãy bấm để chọn thư mục."));
  };

  const message = readError ?? error;
  return (
    <div>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center rounded-m3-md border-2 border-dashed px-4 py-6 text-center transition focus-within:ring-2 focus-within:ring-primary ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        } ${dragging ? "border-primary bg-primary-container/50" : "border-outline-variant bg-surface-container-low hover:border-primary/60"}`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
          <FolderOpen size={22} aria-hidden />
        </span>
        <span className="md-title-medium mt-3 text-on-surface">Kéo thả thư mục đề (một hoặc nhiều) vào đây, hoặc bấm để chọn</span>
        <span className="md-body-small mt-0.5 break-words text-on-surface-variant">Thư mục gồm images/Q1.webp, Q2.webp… và ans.json nằm cạnh images</span>
        <input
          ref={input}
          id={inputId}
          type="file"
          multiple
          disabled={disabled}
          aria-invalid={message ? true : undefined}
          className="sr-only"
          onChange={(e) => {
            setReadError(undefined);
            const entries = fromInput(e.target.files);
            e.target.value = ""; // chọn lại đúng thư mục vẫn nhận
            if (entries.length) onPick(entries);
          }}
        />
      </label>
      {message && (
        <p role="alert" className="md-body-small mt-1 px-4 text-error">
          {message}
        </p>
      )}
    </div>
  );
}

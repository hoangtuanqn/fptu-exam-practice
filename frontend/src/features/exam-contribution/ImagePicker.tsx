import { useEffect, useId, useState, type DragEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import { IconButton } from "@/shared/ui/Button";
import { ACCEPTED_TYPES, MAX_IMAGE_MB, MAX_IMAGES } from "./limits";
import { pickImages } from "./pickImages";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  error?: string;
  disabled?: boolean;
}

// Chọn nhiều ảnh đề: kéo thả hoặc bấm để chọn, xem trước, bỏ từng ảnh
export function ImagePicker({ files, onChange, error, disabled }: Props) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [skipped, setSkipped] = useState<string>();
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);

  // Link xem trước chỉ sống khi danh sách còn dùng: đổi danh sách hoặc rời trang thì thu hồi
  useEffect(() => {
    const made = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPreviews(made);
    return () => made.forEach((p) => URL.revokeObjectURL(p.url));
  }, [files]);

  const add = (incoming: File[]) => {
    if (disabled || incoming.length === 0) return;
    const r = pickImages(files, incoming);
    setSkipped(r.error);
    onChange(r.files);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    add(Array.from(e.dataTransfer.files));
  };

  const message = skipped ?? error;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={inputId} className="md-label-large text-on-surface-variant">
          Ảnh đề thi
        </label>
        <span className="md-label-large tabular-nums text-on-surface-variant" aria-live="polite">
          {files.length}/{MAX_IMAGES}
        </span>
      </div>
      <label
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
          <ImagePlus size={22} aria-hidden />
        </span>
        <span className="md-title-medium mt-3 text-on-surface">Kéo thả ảnh vào đây, hoặc bấm để chọn</span>
        <span className="md-body-small mt-0.5 text-on-surface-variant">
          JPG, PNG hoặc WebP, mỗi ảnh tối đa {MAX_IMAGE_MB} MB, tối đa {MAX_IMAGES} ảnh
        </span>
        <input
          id={inputId}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(",")}
          disabled={disabled}
          aria-invalid={message ? true : undefined}
          className="sr-only"
          onChange={(e) => {
            add(Array.from(e.target.files ?? []));
            e.target.value = ""; // chọn lại đúng ảnh vừa bỏ vẫn nhận
          }}
        />
      </label>
      {message && (
        <p role="alert" className="md-body-small mt-1 px-4 text-error">
          {message}
        </p>
      )}

      {previews.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {previews.map(({ file: f, url }, i) => (
            <li key={url} className="relative overflow-hidden rounded-m3-sm border border-outline-variant bg-surface-container">
              <img src={url} alt={`Ảnh ${i + 1}: ${f.name}`} className="aspect-[3/4] w-full object-cover" />
              <span className="md-label-small absolute bottom-1 left-1 rounded bg-scrim/60 px-1.5 text-white">{i + 1}</span>
              <IconButton
                label={`Bỏ ảnh ${i + 1}`}
                disabled={disabled}
                className="absolute right-0.5 top-0.5 bg-surface/90"
                onClick={() => {
                  setSkipped(undefined);
                  onChange(files.filter((x) => x !== f));
                }}
              >
                <X size={18} aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

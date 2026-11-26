import { useState, type CSSProperties, type SyntheticEvent } from "react";
import { contentBox } from "@/features/practice/utils/contentBox";

const SAMPLE_WIDTH = 960; // đủ để nét chữ mảnh còn thấy, đủ nhỏ để đo trong vài mili giây
const PADDING = 24; // lề quanh vùng chữ, tính theo ảnh gốc
const ORIGINAL_KEY = "practice.imageOriginal";

const cache = new Map<string, CSSProperties | null>(); // theo địa chỉ ảnh: quay lại câu cũ không đo lại

// Đọc điểm ảnh được vì ảnh hiển thị bằng blob (ProtectedImg) hoặc từ thư mục máy; lỗi gì cũng hiện nguyên ảnh
function measure(img: HTMLImageElement): CSSProperties | null {
  try {
    const { naturalWidth: w, naturalHeight: h } = img;
    const height = Math.round((h * SAMPLE_WIDTH) / w);
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_WIDTH;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, SAMPLE_WIDTH, height);
    const box = contentBox(ctx.getImageData(0, 0, SAMPLE_WIDTH, height).data, SAMPLE_WIDTH, height, Math.round((PADDING * SAMPLE_WIDTH) / w));
    if (!box) return null;
    // Biến CSS cho lớp .q-crop (panel.css)
    return { "--crop-aspect": (w * box.w) / (h * box.h), "--crop-px": w * box.w, "--crop-img": `${100 / box.w}%` } as CSSProperties;
  } catch {
    return null;
  }
}

const readOriginal = () => {
  try {
    return localStorage.getItem(ORIGINAL_KEY) === "1";
  } catch {
    return false;
  }
};

/** Tự cắt khoảng trắng ảnh đề trên màn nhỏ. `style` = null thì hiện nguyên ảnh; người dùng bật "Xem ảnh gốc" được, máy nhớ lại. */
export function useContentCrop(src: string) {
  const [measured, setMeasured] = useState(() => ({ src, style: cache.get(src) ?? null }));
  const [original, setOriginal] = useState(readOriginal);
  const found = measured.src === src ? measured.style : (cache.get(src) ?? null);

  return {
    style: original ? null : found,
    canCrop: !!found,
    original,
    onLoad(e: SyntheticEvent<HTMLImageElement>) {
      let style = cache.get(src);
      if (style === undefined) cache.set(src, (style = measure(e.currentTarget)));
      setMeasured({ src, style });
    },
    toggleOriginal() {
      setOriginal(!original);
      try {
        localStorage.setItem(ORIGINAL_KEY, original ? "0" : "1");
      } catch {
        /* không lưu được thì chỉ đổi trong phiên này */
      }
    },
  };
}

import { brand, logos } from "../../config/brand";

interface Props {
  variant?: "mark" | "full"; // mark: chỉ MST · full: kèm chữ SOFTWARE.VN
  onDark?: boolean; // đặt trên nền tối (chỉ khác ở bản full)
  className?: string; // đặt chiều cao, ví dụ "h-7"
}

// Logo thương hiệu: mọi nơi trong app dùng component này nên đổi logo chỉ cần thay file trong public/brand/
export function Logo({ variant = "mark", onDark = false, className = "h-7" }: Props) {
  const src = variant === "mark" ? logos.mark : onDark ? logos.fullOnDark : logos.fullOnLight;
  return <img src={src} alt={brand.company} className={`w-auto select-none ${className}`} draggable={false} />;
}

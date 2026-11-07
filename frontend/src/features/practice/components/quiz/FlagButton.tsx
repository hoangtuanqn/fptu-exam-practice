import { Flag } from "lucide-react";
import { IconButton } from "@/shared/ui/Button";

interface Props {
  flagged: boolean;
  onToggle: () => void;
}

// Đánh dấu câu cần xem lại (phím tắt M): nút biểu tượng bật/tắt của M3, đang đánh dấu thì nền tonal
export function FlagButton({ flagged, onToggle }: Props) {
  return (
    <IconButton
      label="Đánh dấu xem lại (M)"
      variant={flagged ? "tonal" : "standard"}
      selected={flagged}
      onClick={onToggle}
    >
      <Flag size={20} className={flagged ? "fill-current" : ""} />
    </IconButton>
  );
}

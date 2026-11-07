import { Monitor, Moon, Sun } from "lucide-react";
import { IconButton } from "@/shared/ui/Button";
import { useTheme, type ThemeMode } from "./ThemeContext";

const ORDER: ThemeMode[] = ["system", "light", "dark"];
const LABEL: Record<ThemeMode, string> = { system: "Theo hệ thống", light: "Sáng", dark: "Tối" };

// Nút đổi chủ đề trên thanh ứng dụng: vòng qua Theo hệ thống → Sáng → Tối. Nhãn đọc cho trình đọc màn hình nêu cả chế độ hiện tại lẫn chế độ kế tiếp.
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { mode, setMode } = useTheme();
  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]!;
  const Icon = mode === "system" ? Monitor : mode === "light" ? Sun : Moon;
  return (
    <IconButton label={`Giao diện: ${LABEL[mode]}. Bấm để chuyển sang ${LABEL[next]}`} onClick={() => setMode(next)} className={className}>
      <Icon size={20} />
    </IconButton>
  );
}

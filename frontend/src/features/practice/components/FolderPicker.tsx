import { FolderOpen } from "lucide-react";
import { buttonClass } from "@/shared/ui/Button";
import { FolderInput, type PickFolder } from "./FolderInput";

interface Props {
  onPick: PickFolder;
  variant?: "primary" | "secondary";
  iconOnly?: boolean; // chỉ hiện icon (dùng ở header khi đang làm bài)
}

export function FolderPicker({ onPick, variant = "secondary", iconOnly = false }: Props) {
  return (
    <label
      title="Mở đề khác"
      className={buttonClass({ variant, className: `cursor-pointer ${iconOnly ? "!px-2.5" : ""}` })}
    >
      <FolderOpen size={16} />
      {!iconOnly && "Chọn thư mục đề"}
      <FolderInput onPick={onPick} />
    </label>
  );
}

import type { ReactNode } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

interface Props {
  zoom: number;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onClose: () => void;
}

// Nhóm nút trên thanh công cụ của cửa sổ phóng to: − 100% + | đóng
export function ZoomControls({ zoom, canZoomIn, canZoomOut, onZoomIn, onZoomOut, onReset, onClose }: Props) {
  return (
    <div className="flex items-center gap-1">
      <ToolButton onClick={onZoomOut} disabled={!canZoomOut} label="Thu nhỏ">
        <ZoomOut size={18} />
      </ToolButton>
      <button
        onClick={onReset}
        title="Đặt lại"
        className="w-14 rounded-md py-1 text-center text-sm tabular-nums text-slate-200 hover:bg-surface-container-lowest/10"
      >
        {Math.round(zoom * 100)}%
      </button>
      <ToolButton onClick={onZoomIn} disabled={!canZoomIn} label="Phóng to">
        <ZoomIn size={18} />
      </ToolButton>
      <div className="mx-2 h-5 w-px bg-surface-container-lowest/20" />
      <ToolButton onClick={onClose} label="Đóng (Esc)">
        <X size={20} />
      </ToolButton>
    </div>
  );
}

function ToolButton(props: { children: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.label}
      className="rounded-md p-2 text-slate-200 hover:bg-surface-container-lowest/10 disabled:opacity-30"
    >
      {props.children}
    </button>
  );
}

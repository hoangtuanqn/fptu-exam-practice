import { useCallback, useState } from "react";
import { ListOrdered, X } from "lucide-react";
import { Button, Fab } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";

const NUM = "md-state md-label-large inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full px-2 tabular-nums text-on-surface-variant hover:text-on-surface";

// Nhảy tới câu: máy tính là hàng số câu dính ở đầu, điện thoại là nút "Câu" mở bảng số câu
export function JumpNav({ numbers, onJump }: { numbers: number[]; onJump: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []); // ổn định để Modal không giành lại tiêu điểm mỗi lần trang vẽ lại
  if (numbers.length === 0) return null;
  return (
    <>
      <nav aria-label="Nhảy tới câu" className="sticky top-16 z-20 -mx-4 hidden border-b border-outline-variant bg-surface/95 px-4 py-2 backdrop-blur md:block">
        <div className="flex gap-1 overflow-x-auto">
          {numbers.map((n) => (
            <button key={n} type="button" className={NUM} onClick={() => onJump(n)} aria-label={`Tới câu ${n}`}>
              {n}
            </button>
          ))}
        </div>
      </nav>

      <Fab label="Câu" extended className="fixed bottom-4 right-4 z-20 md:hidden" onClick={() => setOpen(true)}>
        <ListOrdered size={20} />
      </Fab>
      {open && (
        <Modal onClose={close}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="md-title-large text-on-surface">Tới câu</h2>
            <Button size="sm" variant="text" onClick={() => setOpen(false)} aria-label="Đóng">
              <X size={18} />
            </Button>
          </div>
          <div className="grid max-h-[60vh] grid-cols-5 gap-2 overflow-y-auto">
            {numbers.map((n) => (
              <button
                key={n}
                type="button"
                className={`${NUM} bg-surface-container-highest`}
                onClick={() => {
                  setOpen(false);
                  onJump(n);
                }}
                aria-label={`Tới câu ${n}`}
              >
                {n}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
}

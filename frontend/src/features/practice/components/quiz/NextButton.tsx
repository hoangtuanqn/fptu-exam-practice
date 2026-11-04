import { ChevronRight, Send } from "lucide-react";
import { Button } from "@/shared/ui/Button";

interface Props {
  hasNext: boolean;
  onNext: () => void;
  onSubmit?: () => void; // có khi đây là câu cuối và được phép nộp bài
  grow?: boolean;
  className?: string;
}

// Nút "Tiếp"; ở câu cuối thì đổi thành "Nộp bài" (không còn nút Tiếp bị khoá)
export function NextButton({ hasNext, onNext, onSubmit, grow, className }: Props) {
  if (!hasNext && onSubmit) {
    return (
      <Button grow={grow} variant="primary" size="sm" onClick={onSubmit} className={className}>
        Nộp bài
        <Send size={16} />
      </Button>
    );
  }
  return (
    <Button grow={grow} variant="primary" size="sm" onClick={onNext} disabled={!hasNext} className={className}>
      Tiếp
      <ChevronRight size={16} />
    </Button>
  );
}

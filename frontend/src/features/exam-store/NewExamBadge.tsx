import { isNewTerm } from "./term";

// Nhãn nhỏ "Đề mới" cho đề của kỳ hiện tại hoặc kỳ liền trước, để người học biết đề này mới ra chứ không phải đề cũ. Không rõ kỳ thì không hiện.
export function NewExamBadge({ term }: { term: string | null }) {
  if (!isNewTerm(term)) return null;
  return (
    <span title={`Đề kỳ ${term}`} className="shrink-0 rounded bg-warning-container px-1.5 py-0.5 text-[11px] font-semibold leading-none text-on-warning-container">
      Đề mới
    </span>
  );
}

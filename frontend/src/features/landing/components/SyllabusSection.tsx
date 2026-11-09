import { BookMarked, ListTree, Target } from "lucide-react";
import { MAJOR_COUNT, MARQUEE_ROWS, type MajorTone } from "../majors";

const TONE: Record<MajorTone, string> = {
  primary: "bg-primary-container text-on-primary-container",
  secondary: "bg-secondary-container text-on-secondary-container",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
  neutral: "bg-surface-container-highest text-on-surface",
};

const POINTS = [
  { icon: BookMarked, title: "Đồng bộ từ FLM Syllabus", text: "Môn học, chương và chủ đề lấy theo đề cương của trường." },
  { icon: ListTree, title: "Luyện theo chương", text: "Chọn môn, chọn chương, chỉ làm đúng phần cần ôn." },
  { icon: Target, title: "Biết mình yếu ở đâu", text: "Báo cáo điểm mạnh, điểm yếu theo từng chủ đề." },
];

function Row({ groups, reverse }: { groups: (typeof MARQUEE_ROWS)[number]; reverse?: boolean }) {
  const chips = groups.flatMap((g) => g.majors.map((m) => ({ m, tone: g.tone })));
  const half = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className={`flex shrink-0 items-center gap-2 pr-2 ${hidden ? "marquee-dup" : ""}`}>
      {chips.map(({ m, tone }) => (
        <li key={m} className={`md-label-large whitespace-nowrap rounded-full px-4 py-2 ${TONE[tone]}`}>
          {m}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="marquee">
      <div className={`marquee-track ${reverse ? "marquee-rev" : ""}`}>
        {half(false)}
        {half(true)}
      </div>
    </div>
  );
}

// Dải ngành chạy ngang: nhấn mạnh tính năng kết nối FLM Syllabus, dùng được cho mọi ngành của trường
export function SyllabusSection() {
  return (
    <section className="shrink-0 overflow-hidden bg-surface py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-5 text-center">
        <p className="md-label-large uppercase tracking-widest text-primary">Kết nối FLM Syllabus</p>
        <h2 className="md-section-title mt-2 text-on-surface">Ngành nào của FPTU cũng luyện được</h2>
        <p className="md-body-large mx-auto mt-3 max-w-2xl text-on-surface-variant">
          FEPass đồng bộ đề cương môn học từ FLM Syllabus của trường, nên {MAJOR_COUNT} ngành và chuyên ngành đều có chương, chủ đề và đề để ôn.
        </p>
      </div>

      <div className="mt-8 space-y-3" role="list" aria-label="Các ngành và chuyên ngành tại FPTU">
        {MARQUEE_ROWS.map((groups, i) => (
          <Row key={i} groups={groups} reverse={i % 2 === 1} />
        ))}
      </div>

      <ul className="mx-auto mt-10 grid max-w-4xl gap-3 px-5 sm:grid-cols-3">
        {POINTS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-m3-lg border border-outline-variant bg-surface-container-low p-5 text-left">
            <Icon size={22} className="text-primary" />
            <h3 className="md-title-medium mt-3 text-on-surface">{title}</h3>
            <p className="md-body-medium mt-1 text-on-surface-variant">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

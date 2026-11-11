// Tiêu đề mục thống nhất cho cả trang: nhãn nhỏ màu vàng, tiêu đề, câu phụ và một vạch vàng chuyển màu
export function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: React.ReactNode; subtitle?: string }) {
  return (
    <div className="text-center">
      <p className="md-label-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h2 className="md-headline-small mt-1.5 text-on-surface">{title}</h2>
      {subtitle && <p className="md-body-medium mx-auto mt-1.5 max-w-md text-on-surface-variant">{subtitle}</p>}
      <div aria-hidden className="mx-auto mt-3 h-1 w-12 rounded-full bg-gradient-to-r from-[#ffd75e] to-[#f0a800]" />
    </div>
  );
}

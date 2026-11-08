import { Link, useParams } from "react-router-dom";
import { BookOpen, Flame, Layers, Link2, Play } from "lucide-react";
import { SUBJECTS } from "../../../seo.config";
import { Footer } from "@/shared/layout/Footer";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { useApi } from "@/shared/hooks/useApi";
import { buttonClass } from "@/shared/ui/Button";
import { Loading } from "@/shared/ui/Feedback";
import { subjectApi } from "@/features/subject/subject.api";
import NotFoundPage from "@/app/NotFoundPage";

// Trang giới thiệu một môn (SEO): /mon/pro192. Nội dung chính (tên, mô tả) có sẵn trong HTML lúc build; số đề và các chương lấy từ máy chủ khi mở trang.
export default function SubjectPage() {
  const { code = "" } = useParams();
  const subject = SUBJECTS.find((s) => s.code.toLowerCase() === code.toLowerCase());
  const info = useApi(() => (subject ? subjectApi.info(subject.code) : Promise.reject(new Error("no subject"))), [subject?.code]);
  if (!subject) return <NotFoundPage />;
  const d = info.data;

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <p className="md-label-large text-primary">Môn {subject.code}</p>
        <h1 className="md-headline-large mt-1 text-on-surface">Đề thi FE {subject.code}: {subject.name}</h1>
        <p className="md-body-large mt-3 text-on-surface-variant">
          Luyện đề thi FE môn {subject.code} ({subject.name}) với đáp án AI, giải thích từng câu và chấm điểm thang 10. Biết câu nào hay ra qua các kỳ thi để ôn trước, và chỉ luyện đúng chương bạn còn yếu.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link to={`/account/exams?tab=subject&subject=${subject.code}`} className={buttonClass({ variant: "primary" })}>
            <Play size={16} /> {d && d.exams > 0 ? `Xem ${d.exams} đề có sẵn` : "Xem đề có sẵn"}
          </Link>
          <Link to="/" className={buttonClass()}>
            <Link2 size={16} /> Dán link FuOverflow
          </Link>
        </div>

        <section className="mt-10 grid gap-4 sm:grid-cols-3" aria-label="Bạn nhận được gì">
          {[
            { icon: BookOpen, title: "Đề có đáp án", text: "Đề thi FE kèm đáp án AI và giải thích vì sao đúng, vì sao sai." },
            { icon: Flame, title: "Câu hay ra", text: "Những câu lặp lại ở nhiều đề của môn, ôn trước cho hiệu quả." },
            { icon: Layers, title: "Luyện theo chương", text: "Chọn chương còn yếu và chỉ làm các câu thuộc chương đó." },
          ].map((f) => (
            <div key={f.title} className="rounded-m3-md border border-outline-variant p-4">
              <f.icon size={20} className="text-primary" />
              <h2 className="md-title-small mt-2 text-on-surface">{f.title}</h2>
              <p className="md-body-small mt-1 text-on-surface-variant">{f.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-10" aria-label="Các chương của môn">
          <h2 className="md-title-large text-on-surface">Các chương của môn {subject.code}</h2>
          {info.loading && !d ? (
            <Loading />
          ) : d && d.chapters.length > 0 ? (
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-on-surface">
              {d.chapters.map((c) => (
                <li key={c.number} className="md-body-medium">
                  {c.title}
                </li>
              ))}
            </ol>
          ) : (
            <p className="md-body-medium mt-2 text-on-surface-variant">Syllabus của môn này chưa có danh sách chương.</p>
          )}
        </section>

        <section className="mt-10 rounded-m3-md bg-surface-container-low p-5">
          <h2 className="md-title-medium text-on-surface">Ôn nhanh trước kỳ thi</h2>
          <p className="md-body-medium mt-1 text-on-surface-variant">
            Gói Nước rút 14 ngày chỉ 29.000đ hoặc Pro 4 tháng 99.000đ: lấy đề không bị trừ credit, xem đủ câu hay ra, báo cáo điểm yếu theo chủ đề.
          </p>
          <Link to="/pro" className={`${buttonClass({ variant: "primary" })} mt-3`}>
            Xem các gói
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}

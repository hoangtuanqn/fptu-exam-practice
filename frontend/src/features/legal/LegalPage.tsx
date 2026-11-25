import { Link } from "react-router-dom";
import { brand } from "@/shared/brand/brand";
import { Footer } from "@/shared/layout/Footer";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { Card } from "@/shared/ui/Card";
import { LEGAL_DOCS } from "./legal.content";

const withEmail = (text: string) => text.split("{email}").join(brand.contactEmail);

// /chinh-sach (không có slug): danh sách các văn bản. /dieu-khoan, /bao-mat, /thanh-toan-hoan-tien: một văn bản. Công khai.
export default function LegalPage({ slug }: { slug?: string }) {
  const doc = LEGAL_DOCS.find((d) => d.slug === slug);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8">
        {doc ? (
          <>
            <Link to="/chinh-sach" className="md-label-large text-primary hover:underline">
              ← Chính sách
            </Link>
            <h1 className="md-headline-medium mt-3 text-on-surface">{doc.title}</h1>
            <p className="md-body-small mt-1 text-on-surface-variant">Cập nhật lần cuối: {doc.updated}</p>
            <div className="mt-6 space-y-6">
              {doc.sections.map((s) => (
                <section key={s.title}>
                  <h2 className="md-title-medium text-on-surface">{s.title}</h2>
                  <ul className="md-body-medium mt-2 list-disc space-y-1.5 pl-5 text-on-surface-variant">
                    {s.items.map((t) => (
                      <li key={t}>{withEmail(t)}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        ) : (
          <>
            <h1 className="md-headline-medium text-on-surface">Chính sách</h1>
            <p className="md-body-medium mt-1 text-on-surface-variant">Các quy định khi dùng {brand.product}. Cần hỗ trợ: {brand.contactEmail}.</p>
            <div className="mt-6 space-y-3">
              {LEGAL_DOCS.map((d) => (
                <Link key={d.slug} to={`/${d.slug}`} className="block">
                  <Card className="md-state p-4">
                    <div className="md-title-medium text-on-surface">{d.title}</div>
                    <div className="md-body-small mt-0.5 text-on-surface-variant">{d.summary}</div>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

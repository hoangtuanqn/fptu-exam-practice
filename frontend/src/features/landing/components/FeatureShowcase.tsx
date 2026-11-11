import { Crown } from "lucide-react";
import { GlossCard } from "@/shared/ui/GlossCard";
import { GOLD_GLOSS } from "@/shared/ui/gold";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { FEATURE_GROUPS } from "../featureGroups";

// Bảng tính năng chính của hệ thống: bốn nhóm, mỗi nhóm ba mục. Thiết kế để chụp màn hình khoe hệ thống (đủ trong một khung, chữ lớn, đều nhau).
// `standalone`: dùng ở trang /features riêng (không có đệm trên/dưới của khối trang chủ).
export function FeatureShowcase({ standalone = false }: { standalone?: boolean }) {
  return (
    <section id="tinh-nang" className={`bg-surface px-5 ${standalone ? "py-10" : "py-12 sm:py-16"}`}>
      <div className="mx-auto max-w-5xl">
        <SectionTitle eyebrow="Tính năng chính" title="Mọi thứ bạn cần để ôn thi FE, trong một nơi" />

        <div className="mt-8 grid items-start gap-4 sm:mt-10 md:grid-cols-2">
          {FEATURE_GROUPS.map((g) => (
            <GlossCard key={g.title} lift className="overflow-hidden">
              <header className="flex items-center gap-3 bg-gradient-to-r from-[#2a1d00] to-[#4a3500] px-5 py-3.5 text-[#fff6dc] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${GOLD_GLOSS}`}>
                  <g.icon size={19} strokeWidth={2.3} />
                </span>
                <h3 className="md-title-medium flex-1">{g.title}</h3>
                <span className="md-label-small rounded-full bg-white/15 px-2.5 py-1 text-[#ffe58a]">{g.tag}</span>
              </header>
              <ul className="divide-y divide-outline-variant">
                {g.features.map((f) => (
                  <li key={f.title} className="flex items-start gap-3.5 px-5 py-3.5 transition-colors hover:bg-surface-container-low">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                      <f.icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="md-title-small text-on-surface">{f.title}</span>
                        {f.pro && (
                          <span title="Gói Pro không giới hạn lượt dùng mục này" className="inline-flex items-center gap-0.5 rounded-full bg-gradient-to-b from-[#ffd75e] to-[#f0a800] px-1.5 py-px text-[10px] font-bold leading-4 text-[#3a2600]">
                            <Crown size={9} strokeWidth={2.6} /> PRO không giới hạn
                          </span>
                        )}
                      </div>
                      <p className="md-body-medium mt-0.5 text-on-surface-variant">{f.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </GlossCard>
          ))}
        </div>

        <p className="md-body-medium mt-6 text-center text-on-surface-variant">
          Dùng được trên máy tính và điện thoại · Giao diện sáng và tối · Đăng nhập bằng email, Google hoặc GitHub
        </p>
      </div>
    </section>
  );
}

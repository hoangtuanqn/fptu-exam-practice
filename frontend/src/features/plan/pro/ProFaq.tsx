import { ChevronDown } from "lucide-react";
import { GlossCard } from "@/shared/ui/GlossCard";
import { Reveal } from "./Reveal";
import { SectionTitle } from "@/shared/ui/SectionTitle";

const FAQ: [string, string][] = [
  ["Mình trả bằng gì?", "Bằng credit trong ví (1 credit = 1đ). Chưa đủ thì nạp thêm bằng chuyển khoản, xong là quay lại nâng cấp được ngay."],
  ["Pro có giới hạn lượt dùng không?", "Không. Trong thời hạn Pro, bạn lấy đề, xem giải thích AI và nhờ AI giải đề bao nhiêu lần cũng được, không bị trừ credit và không bị giới hạn số lượt mỗi giờ."],
  ["Pro có tự động gia hạn không?", "Không. Bạn trả một lần cho đủ thời hạn, hết hạn là trở về dùng bình thường và không bị trừ thêm đồng nào."],
  ["Mua khi Pro còn hạn thì sao?", "Thời gian được cộng dồn vào hạn hiện tại, không mất ngày nào."],
  ["Hết hạn Pro thì mình mất gì không?", "Không mất gì. Đề đã lấy vẫn nằm trong kho, lời giải đã xem vẫn xem lại được. Chỉ là lần lấy đề mới sẽ tính phí như thường."],
];

export function ProFaq() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-20">
      <Reveal>
        <SectionTitle eyebrow="Hỏi đáp" title="Câu hỏi thường gặp" />
        <GlossCard className="mt-8 divide-y divide-outline-variant overflow-hidden">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border-l-4 border-transparent transition-colors open:border-[#ffc61f] open:bg-[#ffc61f]/5">
              <summary className="md-state md-title-small flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-on-surface [&::-webkit-details-marker]:hidden">
                {q}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition group-open:rotate-180 group-open:bg-[#ffc61f]/30 group-open:text-on-surface">
                  <ChevronDown size={16} />
                </span>
              </summary>
              <p className="md-body-medium px-4 pb-4 text-on-surface-variant">{a}</p>
            </details>
          ))}
        </GlossCard>
      </Reveal>
    </section>
  );
}

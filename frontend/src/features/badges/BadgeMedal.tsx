import {
  Award,
  BookOpenCheck,
  Brain,
  CalendarCheck,
  Crown,
  Eye,
  FileCheck,
  Flag,
  Flame,
  Footprints,
  Gem,
  HandHeart,
  MailCheck,
  Medal,
  Megaphone,
  Repeat,
  Rocket,
  Share2,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  Upload,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { GOLD_GLOSS } from "@/shared/ui/gold";
import type { BadgeTierLevel, MyBadge } from "./badges.api";

// Khóa biểu tượng do máy chủ gửi -> icon lucide. Khóa lạ dùng Award.
const ICONS: Record<string, LucideIcon> = {
  award: Award,
  "book-open-check": BookOpenCheck,
  brain: Brain,
  "calendar-check": CalendarCheck,
  crown: Crown,
  eye: Eye,
  "file-check": FileCheck,
  flag: Flag,
  flame: Flame,
  footprints: Footprints,
  gem: Gem,
  "hand-heart": HandHeart,
  "mail-check": MailCheck,
  medal: Medal,
  megaphone: Megaphone,
  repeat: Repeat,
  rocket: Rocket,
  share: Share2,
  sparkles: Sparkles,
  star: Star,
  target: Target,
  "trending-up": TrendingUp,
  trophy: Trophy,
  upload: Upload,
  users: Users,
  zap: Zap,
};

// Màu huy chương theo bậc: 0 xám (chưa đạt), 1 đồng, 2 bạc, 3 vàng. Màu cố định để giữ đúng chất liệu ở cả giao diện tối.
const TIER_CLASS: Record<BadgeTierLevel, string> = {
  0: "bg-surface-container-highest text-outline ring-1 ring-outline-variant",
  1: "bg-gradient-to-b from-[#f4cba6] via-[#c98149] to-[#8a4b22] text-white ring-1 ring-[#6b3a17]/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
  2: "bg-gradient-to-b from-[#ffffff] via-[#d3dae3] to-[#8d99a8] text-[#1f2937] ring-1 ring-[#64748b]/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
  3: GOLD_GLOSS,
};

export const TIER_NAME: Record<BadgeTierLevel, string> = { 0: "Chưa đạt", 1: "Đồng", 2: "Bạc", 3: "Vàng" };

// Huy hiệu chỉ có một bậc (vd Thành viên Pro): đạt là đạt trọn, nên tô vàng thay vì đồng
export const medalTier = (b: Pick<MyBadge, "tier" | "tiers">): BadgeTierLevel => (b.tier > 0 && (b.tiers?.length ?? 0) === 1 ? 3 : b.tier);

// Mã nhóm do máy chủ gửi -> tên nhóm. Mã lạ (hoặc máy chủ đã gửi sẵn tên) thì hiện nguyên văn.
const CATEGORY_LABEL: Record<string, string> = {
  start: "Khởi đầu",
  exam: "Làm đề",
  score: "Điểm số",
  habit: "Chuyên cần",
  streak: "Chuỗi ngày",
  review: "Ôn tập",
  contribution: "Đóng góp",
  community: "Cộng đồng",
  referral: "Giới thiệu",
  membership: "Thành viên",
};
export const categoryLabel = (c: string) => CATEGORY_LABEL[c] ?? c;

export function BadgeMedal({ icon, tier, size = "md" }: { icon: string; tier: BadgeTierLevel; size?: "sm" | "md" }) {
  const Icon = ICONS[icon] ?? Award;
  const box = size === "sm" ? "h-8 w-8" : "h-14 w-14";
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full ${box} ${TIER_CLASS[tier] ?? TIER_CLASS[0]}`}>
      <Icon size={size === "sm" ? 16 : 26} />
    </span>
  );
}

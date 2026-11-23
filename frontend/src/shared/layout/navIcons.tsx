import type { ComponentType } from "react";

// Icon menu dạng ảnh SVG 3D nhiều màu (public/icons/nav). Cùng cỡ và cùng cách gọi với icon lucide: <Icon size={20} className="..." />
export type NavIconComponent = ComponentType<{ size?: number; className?: string }>;

const img =
  (name: string): NavIconComponent =>
  ({ size = 24, className = "" }) => (
    <img
      src={`/icons/nav/${name}.svg`}
      width={size}
      height={size}
      alt=""
      aria-hidden
      draggable={false}
      decoding="async"
      className={`shrink-0 select-none ${className}`}
    />
  );

export const NAV_ICON = {
  overview: img("overview"),
  library: img("library"),
  contribute: img("contribute"),
  review: img("review"),
  saved: img("saved"),
  frequent: img("frequent"),
  flashcard: img("flashcard"),
  attempts: img("attempts"),
  grades: img("grades"),
  pro: img("pro"),
  deposit: img("deposit"),
  transactions: img("transactions"),
  giftcode: img("giftcode"),
  referral: img("referral"),
  coursera: img("coursera"),
  profile: img("profile"),
  badges: img("badges"),
  users: img("users"),
  online: img("online"),
  sliders: img("sliders"),
  bank: img("bank"),
  bag: img("bag"),
  settings: img("settings"),
  exam: img("exam"),
  upload: img("upload"),
  searchDoc: img("search-doc"),
  history: img("history"),
  report: img("report"),
  thumb: img("thumb"),
  quality: img("quality"),
  bot: img("bot"),
  chat: img("chat"),
  funnel: img("funnel"),
  megaphone: img("megaphone"),
  mail: img("mail"),
  bell: img("bell"),
  link: img("link"),
  home: img("home"),
} as const;

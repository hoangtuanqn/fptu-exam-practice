// Vàng nhận diện của gói Pro (màu cố định, không đổi theo giao diện sáng/tối để chữ luôn đủ tương phản)
export const GOLD = "bg-gradient-to-b from-[#ffd75e] to-[#f0a800] text-[#3a2600]";

// Vàng "bóng": chuyển sắc ba tầng, viền sáng bên trong ở mép trên, mép dưới hơi tối và bóng đổ vàng mềm. Dùng cho biểu tượng, số bước, dấu tích.
// Lưu ý: chỉ MỘT lớp shadow-[...] trên mỗi phần tử (Tailwind không cộng dồn nhiều lớp shadow), nên bóng đổ nằm sẵn trong chuỗi này.
export const GOLD_GLOSS =
  "bg-gradient-to-b from-[#ffe58a] via-[#ffc61f] to-[#e89a00] text-[#3a2600] ring-1 ring-[#b87d00]/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-2px_0_rgba(0,0,0,0.12),0_6px_14px_-4px_rgba(240,168,0,0.6)]";

// Nút vàng bóng cỡ lớn: giống GOLD_GLOSS nhưng bóng đổ rộng hơn để nút nổi khỏi nền
export const GOLD_BUTTON =
  "bg-gradient-to-b from-[#ffe58a] via-[#ffc61f] to-[#e89a00] text-[#3a2600] ring-1 ring-[#b87d00]/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-2px_0_rgba(0,0,0,0.14),0_12px_32px_-8px_rgba(240,168,0,0.75)]";

// Nền vàng sẫm dùng cho phần đầu trang, khối kêu gọi cuối trang và thanh mua nổi
export const DARK_GOLD = "bg-[radial-gradient(ellipse_at_top,#5a4100_0%,#2a1d00_48%,#140e00_100%)] text-[#fff6dc]";

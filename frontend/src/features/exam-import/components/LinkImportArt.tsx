// Hình minh họa cho khối dán link: một trang FuOverflow có link, mũi tên chuyển sang tờ đề đã có đáp án.
// Chỉ để trang trí (ẩn với trình đọc màn hình); màu theo token nên đổi theo giao diện sáng/tối.
export function LinkImportArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 190 150" aria-hidden="true" className={className} fill="none">
      <defs>
        <linearGradient id="lia-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe58a" />
          <stop offset="0.55" stopColor="#ffc61f" />
          <stop offset="1" stopColor="#e89a00" />
        </linearGradient>
      </defs>

      {/* Cửa sổ trình duyệt có link */}
      <g>
        <rect x="6" y="14" width="104" height="76" rx="10" className="fill-surface-container-lowest stroke-outline-variant" strokeWidth="1.5" />
        <path d="M6 32h104" className="stroke-outline-variant" strokeWidth="1.5" />
        <circle cx="19" cy="23" r="2.6" className="fill-outline-variant" />
        <circle cx="29" cy="23" r="2.6" className="fill-outline-variant" />
        <circle cx="39" cy="23" r="2.6" className="fill-outline-variant" />
        <rect x="18" y="42" width="58" height="7" rx="3.5" className="fill-surface-container-high" />
        <rect x="18" y="55" width="80" height="5" rx="2.5" className="fill-surface-container-high" />
        <rect x="18" y="65" width="66" height="5" rx="2.5" className="fill-surface-container-high" />
        {/* Thanh link được chọn */}
        <rect x="16" y="74" width="86" height="11" rx="5.5" fill="url(#lia-gold)" />
        <rect x="23" y="78.5" width="58" height="2.5" rx="1.25" fill="#3a2600" fillOpacity="0.55" />
      </g>

      {/* Mũi tên chuyển sang đề */}
      <path d="M104 84c14 8 22 8 32 -4" stroke="#e89a00" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="1 5" />
      <path d="M132 74l6 7-9 2" stroke="#e89a00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Tờ đề đã có đáp án */}
      <g transform="rotate(5 148 76)">
        <rect x="112" y="40" width="68" height="92" rx="9" className="fill-surface-container-lowest stroke-outline-variant" strokeWidth="1.5" />
        <rect x="121" y="50" width="26" height="6" rx="3" fill="url(#lia-gold)" />
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(0 ${i * 22})`}>
            <rect x="121" y="64" width="44" height="4" rx="2" className="fill-surface-container-high" />
            <circle cx="125" cy="77" r="3.2" className="stroke-outline" strokeWidth="1.2" />
            <circle cx="136" cy="77" r="3.2" className={i === 1 ? "fill-primary stroke-primary" : "stroke-outline"} strokeWidth="1.2" />
            <circle cx="147" cy="77" r="3.2" className="stroke-outline" strokeWidth="1.2" />
          </g>
        ))}
      </g>

      {/* Dấu tích vàng */}
      <circle cx="171" cy="38" r="12" fill="url(#lia-gold)" />
      <path d="M165.5 38.5l4 4 7-8" stroke="#3a2600" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 118l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#ffc61f" />
      <path d="M98 128l1.3 3.7 3.7 1.3-3.7 1.3-1.3 3.7-1.3-3.7-3.7-1.3 3.7-1.3z" fill="#ffc61f" fillOpacity="0.7" />
    </svg>
  );
}

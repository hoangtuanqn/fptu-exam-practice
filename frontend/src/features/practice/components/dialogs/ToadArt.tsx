import type { ToadMood } from "./toadMood";

const OUT = "#9a5f00";

// Hình Cóc Pass theo tâm trạng (cùng phong cách với linh vật ở shared/ui/mascot-art.ts). Mỗi mức điểm có nét mặt và phụ kiện riêng.
export function ToadArt({ mood, board }: { mood: ToadMood; board: string }) {
  const sad = mood === "cry" || mood === "worry";
  return (
    <svg viewBox="0 0 132 108" width="150" height="123" xmlns="http://www.w3.org/2000/svg" role="presentation" aria-hidden="true">
      <defs>
        <radialGradient id="rt-gold" cx=".42" cy=".28" r=".85">
          <stop offset="0" stopColor="#fff08a" />
          <stop offset=".5" stopColor="#ffc61f" />
          <stop offset="1" stopColor="#e29400" />
        </radialGradient>
        <linearGradient id="rt-belly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff9d0" />
          <stop offset="1" stopColor="#ffe58c" />
        </linearGradient>
        <linearGradient id="rt-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a06a22" />
          <stop offset="1" stopColor="#5f3a0d" />
        </linearGradient>
        <linearGradient id="rt-plate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3a6" />
          <stop offset=".55" stopColor="#ffd23a" />
          <stop offset="1" stopColor="#f0a800" />
        </linearGradient>
      </defs>

      <g className="toad-body">
        {/* chân sau */}
        <g stroke={OUT} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
          <path d="M12 82C8 70 18 58 32 60C44 62 46 78 40 86Z" fill="url(#rt-gold)" />
          <path d="M3 90C3 85 12 83 20 85L40 86C46 87 46 92 40 92H8C4 92 3 91 3 90Z" fill="url(#rt-gold)" />
        </g>
        {/* thân + bụng */}
        <ellipse cx="54" cy="64" rx="40" ry="27" fill="url(#rt-gold)" stroke={OUT} strokeWidth="2" />
        <path d="M34 78C46 90 78 90 90 76C80 70 46 70 34 78Z" fill="url(#rt-belly)" opacity=".95" />
        <g fill="#e08e00" opacity=".75">
          <circle cx="22" cy="56" r="3" />
          <circle cx="31" cy="49" r="2.2" />
          <circle cx="17" cy="66" r="2.2" />
        </g>
        <ellipse cx="38" cy="48" rx="14" ry="5.5" fill="#fff" opacity=".28" transform="rotate(-14 38 48)" />

        {(mood === "star" || mood === "perfect") && <Crown />}

        {/* mắt lồi */}
        <g stroke={OUT} strokeWidth="1.8">
          <circle cx="38" cy="38" r="12" fill="url(#rt-gold)" />
          <circle cx="66" cy="37" r="13.5" fill="url(#rt-gold)" />
        </g>
        <Eyes mood={mood} />

        {/* lông mày buồn */}
        {sad && (
          <g stroke="#7a3f00" strokeWidth="2.6" strokeLinecap="round" fill="none">
            <path d={mood === "cry" ? "M26 29L46 22" : "M27 27L46 24"} />
            <path d={mood === "cry" ? "M55 22L79 29" : "M55 23L78 27"} />
          </g>
        )}

        {/* mũi + má */}
        <circle cx="91" cy="55" r="1.1" fill={OUT} />
        <circle cx="87" cy="53.5" r="1.1" fill={OUT} />
        <ellipse cx="75" cy="66" rx="5" ry="3.2" fill="#ff8f6b" opacity={mood === "cry" ? 0.35 : 0.6} />
        <Mouth mood={mood} />

        {mood === "cry" && (
          <g fill="#5ab4ff" stroke="#2b7fc4" strokeWidth=".8">
            <path className="toad-tear" d="M33 50C30 55 31 59 34 59C37 59 38 55 33 50Z" />
            <path className="toad-tear toad-tear-b" d="M64 51C61 56 62 60 65 60C68 60 69 56 64 51Z" />
          </g>
        )}
        {mood === "worry" && <path className="toad-sweat" d="M95 24C91 30 92 34 95.5 34C99 34 99.5 30 95 24Z" fill="#8fd0ff" stroke="#2b7fc4" strokeWidth=".8" />}

        <Board text={board} />
        <Hand x={65} y={90} />
        <Hand x={123} y={90} />
      </g>

      {mood === "zero" && <Dizzy />}
      {mood === "perfect" && <Trophy />}
      {(mood === "good" || mood === "happy") && <Sparkles />}
      {(mood === "star" || mood === "perfect") && <Sparkles big />}
    </svg>
  );
}

function Eyes({ mood }: { mood: ToadMood }) {
  if (mood === "happy") {
    // mắt cười ^ ^
    return (
      <g fill="none" stroke="#1a1208" strokeWidth="3" strokeLinecap="round">
        <path d="M31 41Q39.5 29 48 41" />
        <path d="M58 40Q67.5 27 77 40" />
      </g>
    );
  }
  if (mood === "zero") {
    // mắt xoáy (choáng)
    return (
      <g fill="#fff" stroke={OUT} strokeWidth="1">
        <circle cx="39.5" cy="38.5" r="8" />
        <circle cx="67.5" cy="37.5" r="9.3" />
        <g fill="none" stroke="#1a1208" strokeWidth="1.6" strokeLinecap="round">
          <path d="M39.5 38.5m0 0a1.6 1.6 0 1 1 1.6 1.6a3.4 3.4 0 1 1 -3.4 -3.4a5.2 5.2 0 1 1 5.2 5.2" />
          <path d="M67.5 37.5m0 0a1.8 1.8 0 1 1 1.8 1.8a3.9 3.9 0 1 1 -3.9 -3.9a6 6 0 1 1 6 6" />
        </g>
      </g>
    );
  }
  if (mood === "good") {
    // nháy một mắt
    return (
      <>
        <circle cx="39.5" cy="38.5" r="8" fill="#fff" stroke={OUT} strokeWidth="1" />
        <circle cx="41" cy="39" r="5" fill="#1a1208" />
        <circle cx="42.6" cy="36.8" r="1.8" fill="#fff" />
        <path d="M57 40Q67.5 30 78 40" fill="none" stroke="#1a1208" strokeWidth="3" strokeLinecap="round" />
      </>
    );
  }
  const dy = mood === "cry" || mood === "worry" ? 3 : 0;
  return (
    <>
      <circle cx="39.5" cy="38.5" r="8" fill="#fff" stroke={OUT} strokeWidth="1" />
      <circle cx="67.5" cy="37.5" r="9.3" fill="#fff" stroke={OUT} strokeWidth="1" />
      {mood === "star" || mood === "perfect" ? (
        <g fill="#ffb300" stroke="#b86e00" strokeWidth=".8" strokeLinejoin="round">
          <path d="M40 31l2.4 5 5.4.7-4 3.8 1 5.4-4.8-2.6-4.8 2.6 1-5.4-4-3.8 5.4-.7z" />
          <path d="M68 29.5l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z" />
        </g>
      ) : (
        <>
          <circle cx="41" cy={39 + dy} r="5" fill="#1a1208" />
          <circle cx="69.5" cy={38 + dy} r="5.8" fill="#1a1208" />
          <circle cx="42.6" cy={36.8 + dy} r="1.8" fill="#fff" />
          <circle cx="71.5" cy={35.6 + dy} r="2.1" fill="#fff" />
        </>
      )}
    </>
  );
}

function Mouth({ mood }: { mood: ToadMood }) {
  switch (mood) {
    case "cry":
      return <path d="M60 78Q76 64 96 74" fill="none" stroke="#7a3f00" strokeWidth="2.6" strokeLinecap="round" />;
    case "worry":
      return <path d="M58 72Q66 66 74 72T92 70" fill="none" stroke="#7a3f00" strokeWidth="2.4" strokeLinecap="round" />;
    case "zero":
      return <ellipse cx="76" cy="70" rx="5" ry="6.5" fill="#7a1f12" stroke="#7a3f00" strokeWidth="2" />;
    case "ok":
      return <path d="M54 63Q74 79 96 60" fill="none" stroke="#7a3f00" strokeWidth="2.4" strokeLinecap="round" />;
    case "good":
      return <path d="M52 62Q74 86 98 58" fill="none" stroke="#7a3f00" strokeWidth="2.8" strokeLinecap="round" />;
    default:
      // cười há miệng
      return (
        <g>
          <path d="M52 62Q74 92 98 58Q76 66 52 62Z" fill="#7a1f12" stroke="#7a3f00" strokeWidth="2" strokeLinejoin="round" />
          <path d="M62 71Q74 80 88 69Q76 74 62 71Z" fill="#ff7a7a" />
        </g>
      );
  }
}

// Sao quay quanh đầu khi choáng
function Dizzy() {
  return (
    <g className="toad-dizzy" fill="#ffc61f" stroke="#e08e00" strokeWidth=".6" strokeLinejoin="round">
      {[0, 1, 2].map((i) => {
        const a = (i * 120 * Math.PI) / 180;
        return <path key={i} transform={`translate(${54 + 30 * Math.cos(a)} ${12 + 6 * Math.sin(a)}) scale(.7)`} d="M0 -7C1 -2 2 -1 7 0C2 1 1 2 0 7C-1 2 -2 1 -7 0C-2 -1 -1 -2 0 -7Z" />;
      })}
    </g>
  );
}

// Cúp vàng cho điểm tuyệt đối
function Trophy() {
  return (
    <g transform="translate(103 4)" stroke="#8a5a00" strokeWidth="1.1" strokeLinejoin="round">
      <path d="M4 2H22V12C22 18 18 21 13 21C8 21 4 18 4 12Z" fill="url(#rt-gold)" />
      <path d="M4 5H0C0 11 3 13 6 13M22 5H26C26 11 23 13 20 13" fill="none" />
      <rect x="10.5" y="21" width="5" height="5" fill="#e29400" />
      <rect x="6" y="26" width="14" height="4" rx="1.2" fill="#b97d00" />
      <path d="M13 6l1.3 2.7 3 .4-2.2 2.1.5 3-2.6-1.4-2.6 1.4.5-3L8.7 9.1l3-.4z" fill="#fff6c4" stroke="none" />
    </g>
  );
}

function Crown() {
  return (
    <g transform="translate(34 6)" stroke="#7a4b00" strokeWidth="1.2" strokeLinejoin="round">
      <path d="M0 18L3 4L11 12L20 0L29 12L37 4L40 18Z" fill="#ffd23a" />
      <rect x="0" y="16" width="40" height="5" rx="1.5" fill="#f0a800" />
      <circle cx="3" cy="4" r="2.2" fill="#e53935" />
      <circle cx="20" cy="0" r="2.4" fill="#e53935" />
      <circle cx="37" cy="4" r="2.2" fill="#e53935" />
    </g>
  );
}

function Board({ text }: { text: string }) {
  return (
    <g>
      <rect x="64" y="68" width="60" height="31" rx="3.5" fill="url(#rt-wood)" stroke="#3f2606" strokeWidth="1.2" />
      <rect x="67" y="71" width="54" height="25" rx="2" fill="url(#rt-plate)" stroke="#b97d00" strokeWidth="1" />
      <text x="94.5" y="88.2" textAnchor="middle" fontSize={text.length > 7 ? 7.4 : 8.6} fontWeight="800" fill="#6b3d00" fontFamily="Inter,sans-serif">
        {text}
      </text>
    </g>
  );
}

function Hand({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={OUT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx={x} cy={y} rx="5.6" ry="4.6" fill="url(#rt-gold)" />
      <path d={`M${x - 2.4} ${y - 1.2}V${y + 1.8}M${x + 0.6} ${y - 1.8}V${y + 2.2}M${x + 3.2} ${y - 1}V${y + 1.6}`} fill="none" strokeWidth="1" />
    </g>
  );
}

function Sparkles({ big = false }: { big?: boolean }) {
  const spots: [number, number, number, string][] = big
    ? [[10, 14, 1, "a"], [124, 20, 1.2, "b"], [4, 52, 0.8, "c"], [126, 56, 0.9, "a"], [100, 4, 0.8, "b"], [22, 2, 0.9, "c"]]
    : [[12, 18, 1, "a"], [122, 24, 1, "b"], [126, 58, 0.7, "c"]];
  return (
    <g fill="#ffc61f" stroke="#e08e00" strokeWidth=".6" strokeLinejoin="round">
      {spots.map(([x, y, s, k], i) => (
        <path key={i} className={`toad-spark toad-spark-${k}`} transform={`translate(${x} ${y}) scale(${s})`} d="M0 -7C1 -2 2 -1 7 0C2 1 1 2 0 7C-1 2 -2 1 -7 0C-2 -1 -1 -2 0 -7Z" />
      ))}
    </g>
  );
}

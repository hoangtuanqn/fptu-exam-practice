import type { ToadMood } from "./toadMood";

const OUT = "#9a5f00";
const GOLD = "#ffc61f";

// Cóc Pass đứng bằng hai chân (cùng bảng màu với linh vật ở shared/ui/mascot-art.ts). Mỗi mức điểm có nét mặt, dáng tay và phụ kiện riêng.
// Hệ toạ độ: 120 x 184, phần thân đặt lệch xuống 24 để chừa chỗ phía trên cho tay giơ cao / cúp / sao quay quanh đầu.
export function ToadArt({ mood }: { mood: ToadMood }) {
  const crown = mood === "star" || mood === "perfect";
  return (
    <svg viewBox="0 0 120 184" width="96" height="147" xmlns="http://www.w3.org/2000/svg" role="presentation" aria-hidden="true">
      <defs>
        <radialGradient id="rt-gold" cx=".42" cy=".28" r=".85">
          <stop offset="0" stopColor="#fff08a" />
          <stop offset=".5" stopColor={GOLD} />
          <stop offset="1" stopColor="#e29400" />
        </radialGradient>
        <linearGradient id="rt-belly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff9d0" />
          <stop offset="1" stopColor="#ffe58c" />
        </linearGradient>
      </defs>

      <g transform="translate(0 24)">
        <g className="toad-body">
          {/* chân + bàn chân */}
          <Leg x={44} />
          <Leg x={76} />

          {/* thân + bụng */}
          <ellipse cx="60" cy="98" rx="33" ry="34" fill="url(#rt-gold)" stroke={OUT} strokeWidth="2" />
          <ellipse cx="60" cy="106" rx="21" ry="25" fill="url(#rt-belly)" opacity=".95" />
          <g fill="#e08e00" opacity=".6">
            <circle cx="36" cy="92" r="2.6" />
            <circle cx="84" cy="96" r="2.2" />
            <circle cx="40" cy="108" r="2" />
          </g>

          {/* đầu */}
          <ellipse cx="60" cy="52" rx="42" ry="30" fill="url(#rt-gold)" stroke={OUT} strokeWidth="2" />
          <ellipse cx="44" cy="42" rx="14" ry="5" fill="#fff" opacity=".28" transform="rotate(-14 44 42)" />
          {crown && <Crown />}

          {/* mắt lồi trên đỉnh đầu */}
          <circle cx="36" cy="30" r="14" fill="url(#rt-gold)" stroke={OUT} strokeWidth="1.8" />
          <circle cx="84" cy="30" r="14" fill="url(#rt-gold)" stroke={OUT} strokeWidth="1.8" />
          <Eyes mood={mood} />
          <Brows mood={mood} />

          {/* má + mũi + miệng */}
          <ellipse cx="34" cy="62" rx="6" ry="3.6" fill="#ff8f6b" opacity={mood === "cry" || mood === "zero" ? 0.3 : 0.6} />
          <ellipse cx="86" cy="62" rx="6" ry="3.6" fill="#ff8f6b" opacity={mood === "cry" || mood === "zero" ? 0.3 : 0.6} />
          <circle cx="56" cy="50" r="1.1" fill={OUT} />
          <circle cx="64" cy="50" r="1.1" fill={OUT} />
          <Mouth mood={mood} />

          {/* tay vẽ sau đầu để tay lau mắt / gãi đầu nằm phía trước */}
          <Arms mood={mood} />
          {mood === "cry" && <Tears />}
          {mood === "worry" && <path className="toad-sweat" d="M100 34C96 41 97 46 100.5 46C104 46 105 41 100 34Z" fill="#8fd0ff" stroke="#2b7fc4" strokeWidth=".8" />}
        </g>
      </g>

      {mood === "zero" && <Dizzy />}
      {mood === "perfect" && <Trophy />}
      {(mood === "good" || mood === "happy") && <Sparkles />}
      {(mood === "star" || mood === "perfect") && <Sparkles big />}
    </svg>
  );
}

function Leg({ x }: { x: number }) {
  return (
    <g>
      <path d={`M${x} 118V138`} stroke={OUT} strokeWidth="16" strokeLinecap="round" />
      <path d={`M${x} 118V138`} stroke={GOLD} strokeWidth="12" strokeLinecap="round" />
      <ellipse cx={x + (x < 60 ? -3 : 3)} cy="146" rx="17" ry="7" fill="url(#rt-gold)" stroke={OUT} strokeWidth="1.8" />
      <path d={`M${x + (x < 60 ? -13 : 7)} 147V143M${x + (x < 60 ? -7 : 13)} 148V143`} stroke={OUT} strokeWidth="1.1" strokeLinecap="round" />
    </g>
  );
}

// Cánh tay = nét dày có viền; bàn tay = hình tròn ở đầu tay
function Limb({ d }: { d: string }) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={OUT} strokeWidth="11.5" />
      <path d={d} stroke={GOLD} strokeWidth="8" />
    </g>
  );
}
function Hand({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r="6.6" fill="url(#rt-gold)" stroke={OUT} strokeWidth="1.6" />;
}
function Thumb({ x, y }: { x: number; y: number }) {
  return <rect x={x - 3} y={y - 15} width="6.4" height="12" rx="3.2" fill="url(#rt-gold)" stroke={OUT} strokeWidth="1.4" />;
}

function Arms({ mood }: { mood: ToadMood }) {
  switch (mood) {
    case "zero":
      // tay buông thõng
      return (
        <g>
          <Limb d="M30 86Q16 104 22 122" />
          <Limb d="M90 86Q104 104 98 122" />
          <Hand x={22} y={123} />
          <Hand x={98} y={123} />
        </g>
      );
    case "cry":
      // một tay lau mắt bằng khăn giấy, tay kia ôm khăn
      return (
        <g>
          <Limb d="M30 86Q18 104 30 118" />
          <Hand x={31} y={119} />
          <Limb d="M90 86Q112 78 94 44" />
          <g>
            <path d="M86 40Q92 33 101 38Q104 46 96 50Q87 50 86 40Z" fill="#fff" stroke="#9fb4c8" strokeWidth="1.2" />
            <path d="M90 42Q94 40 98 43" fill="none" stroke="#c4d2e0" strokeWidth="1" />
          </g>
          <Hand x={92} y={46} />
        </g>
      );
    case "worry":
      // gãi đầu
      return (
        <g>
          <Limb d="M30 86Q16 104 24 120" />
          <Hand x={25} y={121} />
          <Limb d="M90 86Q114 70 98 30" />
          <Hand x={97} y={26} />
        </g>
      );
    case "ok":
      // chắp tay trước bụng, mỉm cười
      return (
        <g>
          <Limb d="M30 88Q36 108 54 112" />
          <Limb d="M90 88Q84 108 66 112" />
          <Hand x={55} y={112} />
          <Hand x={65} y={112} />
        </g>
      );
    case "good":
      // một tay chống hông, một tay giơ ngón cái
      return (
        <g>
          <Limb d="M30 88Q10 98 32 112" />
          <Hand x={33} y={112} />
          <Limb d="M90 88Q110 84 104 64" />
          <Thumb x={104} y={62} />
          <Hand x={104} y={64} />
        </g>
      );
    case "perfect":
      // ôm chiếc cúp trước bụng (cúp vẽ sau cùng, đè lên bụng)
      return (
        <g>
          <Limb d="M30 86Q24 98 40 90" />
          <Limb d="M90 86Q96 98 80 90" />
          <Hand x={40} y={90} />
          <Hand x={80} y={90} />
        </g>
      );
    default:
      // happy, star: hai tay giơ cao reo mừng
      return (
        <g>
          <Limb d="M30 86Q8 70 14 44" />
          <Limb d="M90 86Q112 70 106 44" />
          <Hand x={14} y={42} />
          <Hand x={106} y={42} />
        </g>
      );
  }
}

function Eyes({ mood }: { mood: ToadMood }) {
  const whites = (
    <>
      <circle cx="36" cy="30" r="10" fill="#fff" stroke={OUT} strokeWidth="1" />
      <circle cx="84" cy="30" r="10" fill="#fff" stroke={OUT} strokeWidth="1" />
    </>
  );
  if (mood === "happy") {
    // mắt cười ^ ^
    return (
      <g fill="none" stroke="#1a1208" strokeWidth="3.2" strokeLinecap="round">
        <path d="M27 34Q36 22 45 34" />
        <path d="M75 34Q84 22 93 34" />
      </g>
    );
  }
  if (mood === "zero") {
    return (
      <>
        {whites}
        <g fill="none" stroke="#1a1208" strokeWidth="1.6" strokeLinecap="round">
          <path d="M36 30m0 0a1.6 1.6 0 1 1 1.6 1.6a3.4 3.4 0 1 1 -3.4 -3.4a5.2 5.2 0 1 1 5.2 5.2" />
          <path d="M84 30m0 0a1.6 1.6 0 1 1 1.6 1.6a3.4 3.4 0 1 1 -3.4 -3.4a5.2 5.2 0 1 1 5.2 5.2" />
        </g>
      </>
    );
  }
  if (mood === "star" || mood === "perfect") {
    return (
      <>
        {whites}
        <g fill="#ffb300" stroke="#b86e00" strokeWidth=".8" strokeLinejoin="round">
          <path transform="translate(36 30)" d="M0 -7l2 4.4 4.8.6-3.5 3.3.9 4.8L0 3.7l-4.2 2.4.9-4.8-3.5-3.3 4.8-.6z" />
          <path transform="translate(84 30)" d="M0 -7l2 4.4 4.8.6-3.5 3.3.9 4.8L0 3.7l-4.2 2.4.9-4.8-3.5-3.3 4.8-.6z" />
        </g>
      </>
    );
  }
  const dy = mood === "cry" || mood === "worry" ? 2.5 : 0;
  const right = mood === "good" ? (
    // nháy một mắt
    <path d="M75 32Q84 24 93 32" fill="none" stroke="#1a1208" strokeWidth="3.2" strokeLinecap="round" />
  ) : (
    <>
      <circle cx="84" cy="30" r="10" fill="#fff" stroke={OUT} strokeWidth="1" />
      <circle cx="85" cy={31 + dy} r="5.6" fill="#1a1208" />
      <circle cx="86.8" cy={28.8 + dy} r="1.9" fill="#fff" />
    </>
  );
  return (
    <>
      <circle cx="36" cy="30" r="10" fill="#fff" stroke={OUT} strokeWidth="1" />
      <circle cx="37" cy={31 + dy} r="5.6" fill="#1a1208" />
      <circle cx="38.8" cy={28.8 + dy} r="1.9" fill="#fff" />
      {right}
    </>
  );
}

function Brows({ mood }: { mood: ToadMood }) {
  if (mood !== "cry" && mood !== "worry") return null;
  const strong = mood === "cry";
  return (
    <g stroke="#7a3f00" strokeWidth="2.8" strokeLinecap="round" fill="none">
      <path d={strong ? "M23 17L48 8" : "M24 15L48 10"} />
      <path d={strong ? "M72 8L97 17" : "M72 10L96 15"} />
    </g>
  );
}

function Mouth({ mood }: { mood: ToadMood }) {
  switch (mood) {
    case "zero":
      return <ellipse cx="60" cy="68" rx="5.5" ry="7" fill="#7a1f12" stroke="#7a3f00" strokeWidth="2" />;
    case "cry":
      return <path d="M46 72Q60 58 74 72" fill="none" stroke="#7a3f00" strokeWidth="2.8" strokeLinecap="round" />;
    case "worry":
      return <path d="M46 66Q53 61 60 66T74 66" fill="none" stroke="#7a3f00" strokeWidth="2.6" strokeLinecap="round" />;
    case "ok":
      return <path d="M44 61Q60 74 76 61" fill="none" stroke="#7a3f00" strokeWidth="2.6" strokeLinecap="round" />;
    case "good":
      return <path d="M42 60Q60 80 78 60" fill="none" stroke="#7a3f00" strokeWidth="3" strokeLinecap="round" />;
    default:
      // cười há miệng
      return (
        <g>
          <path d="M40 58Q60 88 80 58Q60 66 40 58Z" fill="#7a1f12" stroke="#7a3f00" strokeWidth="2" strokeLinejoin="round" />
          <path d="M49 68Q60 77 71 68Q60 72 49 68Z" fill="#ff7a7a" />
        </g>
      );
  }
}

function Tears() {
  return (
    <g fill="#5ab4ff" stroke="#2b7fc4" strokeWidth=".8">
      <path className="toad-tear" d="M30 44C27 50 28 54 31 54C34 54 35 50 30 44Z" />
      <path className="toad-tear toad-tear-b" d="M52 46C49 52 50 56 53 56C56 56 57 52 52 46Z" />
    </g>
  );
}

function Crown() {
  return (
    <g transform="translate(43 5) scale(.78)" stroke="#7a4b00" strokeWidth="1.3" strokeLinejoin="round">
      <path d="M0 22L3 6L12 15L22 0L32 15L41 6L44 22Z" fill="#ffd23a" />
      <rect x="0" y="20" width="44" height="6" rx="1.5" fill="#f0a800" />
      <circle cx="3" cy="6" r="2.4" fill="#e53935" />
      <circle cx="22" cy="0" r="2.6" fill="#e53935" />
      <circle cx="41" cy="6" r="2.4" fill="#e53935" />
    </g>
  );
}

// Sao quay quanh đầu khi choáng
function Dizzy() {
  return (
    <g className="toad-dizzy" fill={GOLD} stroke="#e08e00" strokeWidth=".6" strokeLinejoin="round">
      {[0, 1, 2].map((i) => {
        const a = (i * 120 * Math.PI) / 180;
        return <path key={i} transform={`translate(${60 + 34 * Math.cos(a)} ${34 + 8 * Math.sin(a)}) scale(.8)`} d="M0 -7C1 -2 2 -1 7 0C2 1 1 2 0 7C-1 2 -2 1 -7 0C-2 -1 -1 -2 0 -7Z" />;
      })}
    </g>
  );
}

// Cúp vàng ôm trước bụng cho điểm tuyệt đối (hai tay nắm hai quai)
function Trophy() {
  return (
    <g transform="translate(46 100)" stroke="#8a5a00" strokeWidth="1.2" strokeLinejoin="round">
      <path d="M2 2H26V16C26 23 21 27 14 27C7 27 2 23 2 16Z" fill="url(#rt-gold)" />
      <path d="M2 6H-4C-4 14 0 17 4 17M26 6H32C32 14 28 17 24 17" fill="none" />
      <rect x="11" y="27" width="6" height="6" fill="#e29400" />
      <rect x="6" y="33" width="16" height="4" rx="1.3" fill="#b97d00" />
      <path d="M14 7l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="#fff6c4" stroke="none" />
    </g>
  );
}

function Sparkles({ big = false }: { big?: boolean }) {
  const spots: [number, number, number, string][] = big
    ? [[8, 14, 1, "a"], [112, 18, 1.2, "b"], [4, 80, 0.8, "c"], [116, 86, 0.9, "a"], [100, 4, 0.8, "b"], [20, 2, 0.9, "c"]]
    : [[10, 20, 1, "a"], [110, 24, 1, "b"], [114, 84, 0.7, "c"]];
  return (
    <g fill={GOLD} stroke="#e08e00" strokeWidth=".6" strokeLinejoin="round">
      {spots.map(([x, y, s, k], i) => (
        <path key={i} className={`toad-spark toad-spark-${k}`} transform={`translate(${x} ${y}) scale(${s})`} d="M0 -7C1 -2 2 -1 7 0C2 1 1 2 0 7C-1 2 -2 1 -7 0C-2 -1 -1 -2 0 -7Z" />
      ))}
    </g>
  );
}

// Đổi LaTeX trong văn bản AI sang chữ Unicode dễ đọc (giao diện không render LaTeX). Thuần, idempotent, không ném lỗi, công việc tuyến tính theo độ dài.

const MAX_SPAN = 400; // một đoạn toán dài hơn mức này thì không phải công thức thật: để nguyên
const MAX_DEPTH = 12; // độ sâu lồng nhau tối đa của {...}
const MAX_INPUT = 100_000; // đầu vào dài hơn: trả nguyên văn (lời giải thật chỉ vài KB)

const SYMBOLS: Record<string, string> = {
  to: "→", rightarrow: "→", longrightarrow: "→", leftarrow: "←", longleftarrow: "←", leftrightarrow: "↔", Rightarrow: "⇒", Longrightarrow: "⇒", implies: "⇒",
  Leftarrow: "⇐", Leftrightarrow: "⇔", iff: "⇔", mapsto: "↦", uparrow: "↑", downarrow: "↓",
  in: "∈", notin: "∉", ni: "∋", subset: "⊂", subseteq: "⊆", supset: "⊃", supseteq: "⊇", cup: "∪", cap: "∩", setminus: "∖", emptyset: "∅", varnothing: "∅",
  ge: "≥", geq: "≥", le: "≤", leq: "≤", ne: "≠", neq: "≠", approx: "≈", equiv: "≡", sim: "∼", simeq: "≃", cong: "≅", propto: "∝", ll: "≪", gg: "≫",
  times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓", ast: "∗", star: "⋆", circ: "∘", bullet: "•", oplus: "⊕", otimes: "⊗",
  infty: "∞", forall: "∀", exists: "∃", nexists: "∄", neg: "¬", lnot: "¬", land: "∧", wedge: "∧", lor: "∨", vee: "∨", top: "⊤", bot: "⊥", vdash: "⊢", models: "⊨",
  sum: "∑", prod: "∏", int: "∫", oint: "∮", partial: "∂", nabla: "∇", angle: "∠", triangle: "△", perp: "⊥", parallel: "∥", mid: "∣", nmid: "∤",
  ldots: "…", dots: "…", cdots: "…", vdots: "⋮", ddots: "⋱", prime: "′", degree: "°", hbar: "ℏ", ell: "ℓ", Re: "ℜ", Im: "ℑ", aleph: "ℵ",
  lfloor: "⌊", rfloor: "⌋", lceil: "⌈", rceil: "⌉", langle: "⟨", rangle: "⟩", lbrace: "{", rbrace: "}", backslash: "\\",
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", zeta: "ζ", eta: "η", theta: "θ", vartheta: "ϑ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν",
  xi: "ξ", pi: "π", varpi: "ϖ", rho: "ρ", varrho: "ϱ", sigma: "σ", varsigma: "ς", tau: "τ", upsilon: "υ", phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ", Upsilon: "Υ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
};
const SPACES = new Set(["quad", "qquad", "enspace", "thinspace", "medspace", "thickspace"]);
const DROP = new Set(["left", "right", "displaystyle", "textstyle", "scriptstyle", "limits", "nolimits", "big", "Big", "bigg", "Bigg", "bigl", "bigr", "Bigl", "Bigr", "middle", "nonumber", "label"]);
const WRAPPERS = new Set([
  "mathrm", "mathbf", "mathit", "mathsf", "mathtt", "mathcal", "mathscr", "mathfrak", "text", "textbf", "textit", "textrm", "textsf", "texttt", "emph", "mbox", "boldsymbol", "bm",
  "overline", "underline", "hat", "bar", "vec", "tilde", "widehat", "widetilde", "boxed", "operatorname", "cancel",
]);
const BLACKBOARD: Record<string, string> = { N: "ℕ", Z: "ℤ", Q: "ℚ", R: "ℝ", C: "ℂ" };
const BLACKBOARD_CMDS = new Set(["mathbb", "mathbf", "mathrm", "mathbfit", "textbf", "bm", "boldsymbol"]);

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿⁱ";
const SUP_SRC = "0123456789+-=()ni";
const SUB = "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ";
const SUB_SRC = "0123456789+-=()aehijklmnoprstuvx";

function script(s: string, from: string, to: string): string | null {
  let out = "";
  for (const ch of s.replace(/\s+/g, "")) {
    const k = from.indexOf(ch);
    if (k < 0) return null;
    out += [...to][k];
  }
  return out;
}

/** Vị trí `}` đóng của `{` ở `at` (bỏ qua `\{`, `\}`); không có thì cuối chuỗi. */
function closeOf(s: string, at: number): number {
  let depth = 0;
  for (let i = at; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") i++;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return i;
  }
  return s.length;
}

const simple = (x: string) => /^√?[\p{L}\p{N}.²³½]+$/u.test(x);
const paren = (x: string) => (simple(x) ? x : `(${x})`);

/** Chuyển nội dung một công thức LaTeX sang chữ thường. */
function conv(s: string, depth = 0): string {
  if (depth > MAX_DEPTH) return s.replace(/[\\{}]/g, "");
  let out = "";
  let i = 0;
  // Một đối số: {nhóm}, \lệnh hoặc một ký tự; trả về [chữ đã đổi, vị trí tiếp theo]
  const arg = (from: number): [string, number] => {
    let at = from;
    while (s[at] === " ") at++;
    if (at >= s.length) return ["", at];
    if (s[at] === "{") {
      const end = closeOf(s, at);
      return [conv(s.slice(at + 1, end), depth + 1).trim(), end + 1];
    }
    if (s[at] === "\\") {
      const m = /^\\(?:[A-Za-z]+|.)/s.exec(s.slice(at, at + 40));
      const raw = m ? m[0] : "\\";
      return [conv(raw, depth + 1), at + raw.length];
    }
    return [s[at]!, at + 1];
  };

  while (i < s.length) {
    const c = s[i]!;
    if (c === "{") {
      const end = closeOf(s, i);
      out += conv(s.slice(i + 1, end), depth + 1);
      i = end + 1;
    } else if (c === "}") i++;
    else if (c === "~") (out += " "), i++;
    else if (c === "&") (out += " "), i++;
    else if (c === "^" || c === "_") {
      const [a, next] = arg(i + 1);
      i = next;
      if (c === "^" && a === "∘") out += "°";
      else {
        const mapped = c === "^" ? script(a, SUP_SRC, SUP) : script(a, SUB_SRC, SUB);
        out += mapped ?? (a.length <= 1 ? c + a : `${c}(${a})`);
      }
    } else if (c !== "\\") {
      out += c;
      i++;
    } else {
      const m = /^[A-Za-z]+/.exec(s.slice(i + 1, i + 40));
      if (!m) {
        // \, \; \! \: \<space> \\ \{ \} \% \_ \# \& \$ ...
        const e = s[i + 1] ?? "";
        out += e === "!" ? "" : /^[,;: ]$/.test(e) ? " " : e === "\\" ? " " : e;
        i += 2;
        continue;
      }
      const name = m[0];
      i += 1 + name.length;
      if (name === "frac" || name === "dfrac" || name === "tfrac") {
        const [a, j] = arg(i);
        const [b, k] = arg(j);
        out += `${paren(a)}/${paren(b)}`;
        i = k;
      } else if (name === "sqrt") {
        let root = "";
        if (s[i] === "[") {
          const end = s.indexOf("]", i);
          if (end > 0 && end - i < 20) (root = script(conv(s.slice(i + 1, end), depth + 1), SUP_SRC, SUP) ?? ""), (i = end + 1);
        }
        const [a, j] = arg(i);
        out += `${root}√${paren(a)}`;
        i = j;
      } else if (name === "begin" || name === "end") i = arg(i)[1];
      else if (BLACKBOARD_CMDS.has(name) && /^\s*(\{\s*[NZQRC]\s*\}|[NZQRC](?![A-Za-z]))/.test(s.slice(i, i + 8))) {
        const [a, j] = arg(i);
        out += BLACKBOARD[a] ?? a;
        i = j;
      } else if (WRAPPERS.has(name) || name === "mathbb") {
        const [a, j] = arg(i);
        out += a;
        i = j;
      } else if (name in SYMBOLS) {
        out += SYMBOLS[name];
        if (s[i] === ".") i++; // \left. \right.
      } else if (SPACES.has(name)) out += " ";
      else if (DROP.has(name)) {
        if (s[i] === ".") i++;
      } else out += name; // lệnh lạ hoặc tên hàm (sin, log...): bỏ dấu \ giữ chữ cho dễ đọc
    }
  }
  return out;
}

const clean = (s: string) => conv(s).replace(/[ \t]{2,}/g, " ").trim();

/** `$...$` đơn: quy tắc kiểu Pandoc để `$5`, `100$`, `$5 và $10` không bị coi là công thức. */
function inlineDollar(s: string, at: number): { end: number } | null {
  const limit = Math.min(s.length, at + 1 + MAX_SPAN);
  for (let j = at + 1; j < limit; j++) {
    const c = s[j];
    if (c === "\n") return null;
    if (c === "\\") j++;
    else if (c === "$") {
      const inner = s.slice(at + 1, j);
      if (!inner || /^\s|\s$/.test(inner) || /\d/.test(s[j + 1] ?? "")) return null;
      return { end: j };
    }
  }
  return null;
}

/** Xử lý một đoạn không phải code. */
function convertProse(s: string): string {
  if (!/[$\\]/.test(s)) return s;
  let out = "";
  let i = 0;
  const re = /[$\\]/g;
  // Không có dấu đóng thì các lần tìm sau cũng không có: nhớ kết quả để không quét lại cả chuỗi mỗi lần (tránh O(n^2))
  const seen = new Map<string, number>();
  const find = (tok: string, from: number) => {
    const hit = seen.get(tok);
    if (hit !== undefined && (hit < 0 || hit >= from)) return hit;
    const idx = s.indexOf(tok, from);
    seen.set(tok, idx);
    return idx;
  };
  while (i < s.length) {
    re.lastIndex = i;
    const m = re.exec(s);
    if (!m) break;
    const at = m.index;
    out += s.slice(i, at);
    i = at;
    const two = s.slice(at, at + 2);
    let close = -1;
    let open = 1;
    if (two === "\\(" || two === "\\[") {
      open = 2;
      const end = find(two ==="\\(" ? "\\)" : "\\]", at + 2);
      if (end > 0 && end - at <= MAX_SPAN) close = end;
    } else if (two === "$$") {
      open = 2;
      const end = find("$$", at + 2);
      if (end > 0 && end - at <= MAX_SPAN) close = end;
    } else if (s[at] === "$") {
      close = inlineDollar(s, at)?.end ?? -1;
    } else if (two === "\\$") {
      out += "$";
      i += 2;
      continue;
    } else {
      // \lệnh nằm ngoài dấu $: chỉ đổi ký hiệu đã biết, để nguyên đường dẫn kiểu C:\Users
      const name = /^[A-Za-z]+/.exec(s.slice(at + 1, at + 40))?.[0];
      if (name && name in SYMBOLS) (out += SYMBOLS[name]), (i = at + 1 + name.length);
      else (out += "\\"), i++;
      continue;
    }
    if (close < 0) {
      out += s.slice(at, at + open); // không phải công thức: giữ nguyên ký tự mở
      i = at + open;
    } else {
      out += clean(s.slice(at + open, close));
      i = close + open;
    }
  }
  return out + s.slice(i);
}

/** Đổi LaTeX trong lời giải AI sang chữ Unicode; không đụng vào code (``` và `inline`). Văn bản không có toán giữ nguyên từng byte. */
export function plainMath(text: string): string {
  if (!text || text.length > MAX_INPUT || !/[$\\]/.test(text)) return text;
  try {
    let out = "";
    let i = 0;
    while (i < text.length) {
      const tick = text.indexOf("`", i);
      if (tick < 0) break;
      const fence = text.startsWith("```", tick);
      const mark = fence ? "```" : "`";
      const end = text.indexOf(mark, tick + mark.length);
      if (end < 0 || (!fence && text.slice(tick, end).includes("\n"))) {
        // backtick lẻ: coi là chữ thường, đi tiếp
        out += convertProse(text.slice(i, tick + 1));
        i = tick + 1;
        continue;
      }
      out += convertProse(text.slice(i, tick)) + text.slice(tick, end + mark.length);
      i = end + mark.length;
    }
    return out + convertProse(text.slice(i));
  } catch {
    return text;
  }
}

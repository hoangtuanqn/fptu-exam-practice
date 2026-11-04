import fs from "node:fs";
import path from "node:path";

/**
 * Loader prompt hệ thống theo module. Có HAI bộ prompt độc lập, mỗi bộ cho một việc, nằm ở backend/prompts/:
 *   solve/     AI tìm đáp án cho CẢ ĐỀ (nhiều ảnh, trả JSON theo schema)
 *   explain/   AI giải thích MỘT câu (một ảnh, trả Markdown tiếng Việt)
 * Mỗi bộ gồm:
 *   base.md              vai trò + nguyên tắc chung, đúng với MỌI môn (ngắn)
 *   modules/<KEY>.md     đặc thù từng môn; modules/_default.md dùng khi không xác định được môn (thân rỗng = không thêm gì)
 *   features/<tên>.md    khối bật theo cờ cấu hình (hiện chỉ solve có web-search)
 * Hai lời gọi không bao giờ mang prompt của nhau: lời gọi giải thích không tốn token cho luật giải 50 câu, và ngược lại.
 *
 * Đọc MỘT lần lúc khởi động và giữ trong bộ nhớ. Muốn đổi prompt thì triển khai lại / khởi động lại server.
 * Việc chọn module là việc của code (resolveModuleKey), prompt không chứa logic "nếu là môn X thì...".
 *
 * Prompt caching của Anthropic xét tiền tố theo thứ tự tools -> system -> messages: đổi ở tầng nào thì tầng đó và mọi tầng
 * sau mất cache. Vì vậy `system` CHỈ chứa nội dung tĩnh (không ngày giờ, ID người dùng, ID request): mọi thứ đổi theo
 * từng request đặt trong `messages`. Khối đổi ít nhất (base) đứng trước và có TTL dài nhất.
 */
const PROMPTS_DIR = path.resolve(__dirname, "../../prompts");
export const DEFAULT_MODULE = "_default";

export type PromptTask = "solve" | "explain";
const TASKS: PromptTask[] = ["solve", "explain"];

export interface PromptMeta {
  key: string;
  description: string;
  version: string;
  updated: string;
}
interface PromptFile {
  meta: PromptMeta;
  text: string; // nội dung không kèm front-matter (front-matter chỉ để quản lý, không gửi cho model)
}

// Một khối của mảng system. Tối đa 4 breakpoint cache_control mỗi request; ở đây dùng tối đa 3.
export interface SystemBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral"; ttl?: "5m" | "1h" };
}

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
// Dữ liệu động làm hỏng prompt cache: chặn ngay khi nạp
const DYNAMIC = [/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i, /\{\{.*?\}\}/];

function parseFile(file: string, expectedKey: string): PromptFile {
  const raw = fs.readFileSync(file, "utf-8");
  const m = raw.match(FRONT_MATTER);
  if (!m) throw new Error(`Prompt ${path.basename(file)} thiếu front-matter (key, description, version, updated)`);
  const fields: Record<string, string> = {};
  for (const line of m[1]!.split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) fields[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  for (const f of ["key", "description", "version", "updated"]) {
    if (!fields[f]) throw new Error(`Prompt ${path.basename(file)} thiếu trường front-matter "${f}"`);
  }
  if (fields.key !== expectedKey) throw new Error(`Prompt ${path.basename(file)}: key "${fields.key}" phải trùng tên file ("${expectedKey}")`);
  const text = raw.slice(m[0].length).trim();
  for (const re of DYNAMIC) {
    if (re.test(text)) throw new Error(`Prompt ${path.basename(file)} chứa dữ liệu động (${re}); đặt nó trong messages, không đặt trong system`);
  }
  return { meta: fields as unknown as PromptMeta, text };
}

function loadDir(dir: string): Map<string, PromptFile> {
  const out = new Map<string, PromptFile>();
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const key = name.slice(0, -3);
    out.set(key, parseFile(path.join(dir, name), key));
  }
  return out;
}

interface Store {
  base: PromptFile;
  modules: Map<string, PromptFile>;
  features: Map<string, PromptFile>;
}

function load(task: PromptTask): Store {
  const dir = path.join(PROMPTS_DIR, task);
  const base = parseFile(path.join(dir, "base.md"), "base");
  const modules = loadDir(path.join(dir, "modules"));
  if (!modules.has(DEFAULT_MODULE)) throw new Error(`Thiếu prompts/${task}/modules/${DEFAULT_MODULE}.md`);
  return { base, modules, features: loadDir(path.join(dir, "features")) };
}

// Đọc một lần lúc khởi động: thiếu hoặc sai file thì lỗi ngay chứ không đợi tới lúc gọi AI
const STORES = Object.fromEntries(TASKS.map((t) => [t, load(t)])) as Record<PromptTask, Store>;

const warned = new Set<string>();
const warnOnce = (id: string, msg: string) => {
  if (warned.has(id)) return;
  warned.add(id);
  console.warn(`[prompts] ${msg}`);
};

/**
 * Mã môn trong tiêu đề đề thi, ví dụ "MAD101 - SU26 - RE" -> "MAD101".
 * Mã môn FPTU gồm 2-4 chữ cái và đúng 3 chữ số (PRO192, MAD101, SWP391...), nên "SU26" hay "PE2023" không bị nhầm.
 */
export function subjectCodeOf(title: string): string | null {
  const m = title.match(/\b[A-Za-z]{2,4}\d{3}[A-Za-z]?\b/);
  return m ? m[0].toUpperCase() : null;
}

/**
 * Chọn module cho một việc theo thứ tự ưu tiên: (1) giá trị truyền tường minh từ nơi gọi, (2) nhận diện bằng regex từ
 * tiêu đề, (3) `_default`. Không gọi AI để chọn. Môn chưa có module của việc đó thì dùng `_default` và ghi cảnh báo
 * (mỗi việc, mỗi mã một lần).
 */
export function resolveModuleKey(task: PromptTask, input: { explicit?: string | null; title?: string | null }): string {
  const given = input.explicit?.trim();
  const explicit = given && given.toLowerCase() === DEFAULT_MODULE ? DEFAULT_MODULE : given?.toUpperCase();
  const candidate = explicit || subjectCodeOf(input.title ?? "");
  if (!candidate) return DEFAULT_MODULE;
  if (STORES[task].modules.has(candidate)) return candidate;
  warnOnce(`${task}:${candidate}`, `chưa có module "${task}" cho "${candidate}"${explicit ? " (truyền tường minh)" : ""}, dùng ${DEFAULT_MODULE}`);
  return DEFAULT_MODULE;
}

/**
 * Mảng system theo thứ tự ổn định: base (đổi ít nhất, TTL 1 giờ) -> module (bỏ qua nếu thân rỗng) -> khối tính năng (nếu bật).
 * Breakpoint cache nằm ở base, ở module và ở khối cuối. Lưu ý: block dưới ngưỡng cache tối thiểu của model (512 token
 * với các model 5.5) không được cache và KHÔNG báo lỗi; tiền tố tính cộng dồn nên base + module thường đủ ngưỡng.
 * Luôn kiểm tra usage.cache_read_input_tokens và usage.cache_creation_input_tokens (xem claude.client).
 */
export function buildSystem(task: PromptTask, key: string, opts: { webSearch?: boolean } = {}): SystemBlock[] {
  const store = STORES[task];
  let mod = store.modules.get(key);
  if (!mod) {
    warnOnce(`${task}:${key}`, `module "${task}/${key}" không tồn tại, dùng ${DEFAULT_MODULE}`);
    mod = store.modules.get(DEFAULT_MODULE)!;
  }
  const blocks: SystemBlock[] = [{ type: "text", text: store.base.text, cache_control: { type: "ephemeral", ttl: "1h" } }];
  if (mod.text) blocks.push({ type: "text", text: mod.text, cache_control: { type: "ephemeral" } });
  const search = opts.webSearch ? store.features.get("web-search") : undefined;
  if (search) blocks.push({ type: "text", text: search.text, cache_control: { type: "ephemeral" } });
  return blocks;
}

export const hasModule = (task: PromptTask, key: string) => STORES[task].modules.has(key);
export const listModules = (task: PromptTask): PromptMeta[] => [...STORES[task].modules.values()].map((m) => m.meta);
export const basePromptMeta = (task: PromptTask): PromptMeta => STORES[task].base.meta;

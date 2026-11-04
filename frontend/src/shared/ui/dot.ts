// Nguồn DOT do AI viết là dữ liệu không tin cậy: chỉ vẽ khi trông giống một đồ thị bình thường, ngắn gọn và không có thuộc tính
// nạp tài nguyên ngoài hay liên kết. Hàm thuần, tách riêng để kiểm thử được.
export const MAX_DOT_LENGTH = 6000;

// "<" chặn nhãn kiểu HTML (có thể chèn <IMG>); các thuộc tính còn lại có thể nạp tệp hoặc tạo liên kết trong SVG
const FORBIDDEN = /<|\b(?:URL|href|image|imagepath|shapefile|fontpath)\s*=|xlink|javascript:/i;
const GRAPH_START = /^(?:strict\s+)?(?:di)?graph\b/i;

// Bộ bố cục: mặc định "dot" tự xếp hình. AI được dặn dùng "neato" kèm pos="x,y!" để đặt từng đỉnh đúng chỗ như trong ảnh đề.
export const ENGINES = ["dot", "neato", "fdp", "circo", "twopi"] as const;
export type DotEngine = (typeof ENGINES)[number];
const LAYOUT = /\blayout\s*=\s*"?([A-Za-z0-9_]+)"?/i;

const asEngine = (name: string | undefined): DotEngine | null => ENGINES.find((e) => e === name?.toLowerCase()) ?? null;

/** Bộ bố cục đồ thị yêu cầu (graph [layout=neato]), mặc định dot. */
export function engineOf(source: string): DotEngine {
  return asEngine(source.match(LAYOUT)?.[1]) ?? "dot";
}

export function isSafeDot(source: string): boolean {
  const text = source.trim();
  if (text.length === 0 || text.length > MAX_DOT_LENGTH || !GRAPH_START.test(text) || FORBIDDEN.test(text)) return false;
  const layout = text.match(LAYOUT)?.[1];
  return layout === undefined || asEngine(layout) !== null; // bộ bố cục lạ bị từ chối
}

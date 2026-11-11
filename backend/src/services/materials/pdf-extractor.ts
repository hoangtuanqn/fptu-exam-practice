import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type * as Pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { MATERIAL_RENDER_DPI } from "../../constants/materials";
import { classifyPage, cleanPageText } from "../../utils/material-analysis";
import type { PageKind } from "../../constants/materials";

// Đọc PDF bằng pdf.js (pdfjs-dist, Apache-2.0): chữ từng trang, diện tích ảnh (duyệt danh sách lệnh vẽ) để biết trang có hình lớn,
// và vẽ một trang ra PNG bằng @napi-rs/canvas (MIT, bản dựng sẵn theo nền tảng). Mọi chỗ dùng thư viện PDF nằm trong file này.
// Cả hai thư viện chỉ được nạp khi cần: thiếu gói canvas (nền tảng không có bản dựng sẵn) thì API vẫn chạy, chỉ job báo lỗi rõ ràng.
// Giới hạn đã biết: sơ đồ vẽ hoàn toàn bằng nét vector (không có ảnh raster) mà vẫn có đủ chữ thì bị coi là trang chữ.

export interface ExtractedPage {
  pageNo: number; // bắt đầu từ 1
  text: string;
  kind: PageKind;
  imageAreaRatio: number;
}

export interface PdfHandle {
  readonly pageCount: number;
  extractPage(pageNo: number): Promise<ExtractedPage>;
  /** Vẽ MỘT trang ra PNG ở MATERIAL_RENDER_DPI. Người gọi giữ ít ảnh nhất có thể (vẽ lúc cần, bỏ ngay sau khi gửi). */
  renderPng(pageNo: number): Promise<Uint8Array>;
  close(): Promise<void>;
}

export interface PdfEngine {
  open(data: Uint8Array): Promise<PdfHandle>;
}

/** Tệp không mở được (hỏng, có mật khẩu, không phải PDF). */
export class PdfOpenError extends Error {}
/** Máy chủ không nạp được thư viện vẽ trang (thiếu bản dựng sẵn của @napi-rs/canvas cho nền tảng này). */
export class PdfRenderUnavailableError extends Error {}

type PdfjsModule = typeof Pdfjs;
type RenderParams = Parameters<Pdfjs.PDFPageProxy["render"]>[0];
type CanvasModule = typeof import("@napi-rs/canvas");

const localRequire = createRequire(__filename);
const PDFJS_ENTRY = "pdfjs-dist/legacy/build/pdf.mjs";
// pdf.js là ES module nên không require() được từ CommonJS; import() thật (không để TypeScript đổi thành require)
const importEsm = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<PdfjsModule>;

let pdfjsLoaded: Promise<PdfjsModule> | null = null;
const loadPdfjs = () => (pdfjsLoaded ??= importEsm(pathToFileURL(localRequire.resolve(PDFJS_ENTRY)).href));

let canvasLoaded: CanvasModule | null = null;
const loadCanvas = (): CanvasModule => {
  if (canvasLoaded) return canvasLoaded;
  try {
    canvasLoaded = localRequire("@napi-rs/canvas") as CanvasModule;
    return canvasLoaded;
  } catch (err) {
    throw new PdfRenderUnavailableError(`@napi-rs/canvas: ${(err as Error).message.split("\n")[0]}`);
  }
};

// Thư mục dữ liệu của pdf.js (phông chuẩn, CMap, wasm giải mã ảnh JPX, ICC), dạng đường dẫn có "/" cuối như pdf.js yêu cầu.
// Tìm lúc mở tài liệu đầu tiên (không tìm khi nạp module) để API vẫn khởi động được dù thiếu gói pdfjs-dist.
let pdfjsDir: string | null = null;
const dataDir = (name: string) => {
  pdfjsDir ??= path.dirname(localRequire.resolve("pdfjs-dist/package.json"));
  return `${path.join(pdfjsDir, name).split(path.sep).join("/")}/`; // pdf.js đòi "/" ở cuối (cả trên Windows)
};

// ---------- Diện tích ảnh từ danh sách lệnh vẽ (hàm thuần, test được) ----------

type Matrix = [number, number, number, number, number, number];
/** Ma trận 6 số từ danh sách lệnh: pdf.js có thể đưa mảng thường hoặc mảng có kiểu (vd Float32Array của form XObject). */
const asMatrix = (m: unknown): number[] | null =>
  (Array.isArray(m) || (ArrayBuffer.isView(m) && !(m instanceof DataView))) && (m as ArrayLike<number>).length === 6 ? Array.from(m as ArrayLike<number>) : null;
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
const multiply = (m: Matrix, n: readonly number[]): Matrix => [
  m[0] * n[0]! + m[2] * n[1]!,
  m[1] * n[0]! + m[3] * n[1]!,
  m[0] * n[2]! + m[2] * n[3]!,
  m[1] * n[2]! + m[3] * n[3]!,
  m[0] * n[4]! + m[2] * n[5]! + m[4],
  m[1] * n[4]! + m[3] * n[5]! + m[5],
];

/** Khung bao của hình vuông đơn vị (ảnh trong PDF luôn vẽ vào [0,1]x[0,1]) sau ma trận `m`, cắt theo khung trang. */
const unitSquareArea = (m: Matrix, view: readonly number[]) => {
  const xs = [m[4], m[0] + m[4], m[2] + m[4], m[0] + m[2] + m[4]];
  const ys = [m[5], m[1] + m[5], m[3] + m[5], m[1] + m[3] + m[5]];
  const w = Math.max(0, Math.min(Math.max(...xs), view[2]!) - Math.max(Math.min(...xs), view[0]!));
  const h = Math.max(0, Math.min(Math.max(...ys), view[3]!) - Math.max(Math.min(...ys), view[1]!));
  return w * h;
};

export interface ImageOps {
  save: number;
  restore: number;
  transform: number;
  paintFormXObjectBegin: number;
  paintFormXObjectEnd: number;
  paintImageXObject: number;
  paintInlineImageXObject: number;
  paintImageMaskXObject: number;
  paintInlineImageXObjectGroup: number;
  paintImageMaskXObjectGroup: number;
  paintImageXObjectRepeat: number;
}

/** Tổng diện tích các ảnh raster (theo CTM: save/restore/transform, form XObject), cắt theo khung trang, chia cho diện tích trang. */
export function imageAreaRatio(fnArray: readonly number[], argsArray: readonly unknown[], ops: ImageOps, view: readonly number[]): number {
  let ctm: Matrix = IDENTITY;
  const stack: Matrix[] = [];
  let area = 0;
  const pageArea = Math.max(1, (view[2]! - view[0]!) * (view[3]! - view[1]!));
  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    const args = (argsArray[i] ?? []) as unknown[];
    if (fn === ops.save) stack.push(ctm);
    else if (fn === ops.restore) ctm = stack.pop() ?? IDENTITY;
    else if (fn === ops.transform) {
      const m = asMatrix(args);
      if (m) ctm = multiply(ctm, m);
    } else if (fn === ops.paintFormXObjectBegin) {
      stack.push(ctm);
      const m = asMatrix(args[0]);
      if (m) ctm = multiply(ctm, m);
    } else if (fn === ops.paintFormXObjectEnd) ctm = stack.pop() ?? IDENTITY;
    else if (fn === ops.paintImageXObject || fn === ops.paintInlineImageXObject || fn === ops.paintImageMaskXObject) area += unitSquareArea(ctm, view);
    else if (fn === ops.paintInlineImageXObjectGroup || fn === ops.paintImageMaskXObjectGroup) {
      const list = (fn === ops.paintInlineImageXObjectGroup ? args[1] : args[0]) as { transform?: unknown }[] | undefined;
      for (const item of Array.isArray(list) ? list : []) {
        const m = asMatrix(item?.transform);
        if (m) area += unitSquareArea(multiply(ctm, m), view);
      }
    } else if (fn === ops.paintImageXObjectRepeat) {
      const [, scaleX, scaleY, rawPositions] = args as [unknown, number, number, ArrayLike<number> | undefined];
      const positions = rawPositions ? Array.from(rawPositions) : [];
      for (let p = 0; p + 1 < positions.length; p += 2) area += unitSquareArea(multiply(ctm, [scaleX, 0, 0, scaleY, positions[p]!, positions[p + 1]!]), view);
    }
  }
  return Math.min(1, area / pageArea);
}

// ---------- Chữ ----------

interface TextItemLike {
  str?: string;
  hasEOL?: boolean;
}

/** Nối các mảnh chữ của pdf.js: xuống dòng ở cuối dòng (hasEOL), cách một khoảng giữa các mảnh rời. */
export function joinTextItems(items: readonly TextItemLike[]): string {
  let out = "";
  for (const it of items) {
    if (typeof it.str !== "string") continue;
    if (out && !out.endsWith("\n") && !out.endsWith(" ") && it.str && !it.str.startsWith(" ")) out += " ";
    out += it.str;
    if (it.hasEOL) out += "\n";
  }
  return out;
}

// ---------- Engine ----------

export const pdfjsEngine: PdfEngine = {
  async open(data) {
    const pdfjs = await loadPdfjs();
    const task = pdfjs.getDocument({
      data: new Uint8Array(data), // pdf.js giữ (và có thể chuyển) bộ đệm: đưa bản sao
      // pdf.js 6 không còn dùng eval (tuỳ chọn isEvalSupported đã bị bỏ); không nạp phông hệ thống, không fetch trong worker
      useSystemFonts: false,
      disableFontFace: true,
      useWorkerFetch: false,
      standardFontDataUrl: dataDir("standard_fonts"),
      wasmUrl: dataDir("wasm"),
      iccUrl: dataDir("iccs"),
      cMapUrl: dataDir("cmaps"), // CMap cho phông CJK / mã hoá riêng (gói kèm sẵn, dạng nén)
      cMapPacked: true,
      verbosity: pdfjs.VerbosityLevel.ERRORS,
      stopAtErrors: false,
    });
    let doc: Pdfjs.PDFDocumentProxy;
    try {
      doc = await task.promise;
    } catch (err) {
      await task.destroy().catch(() => undefined);
      throw new PdfOpenError(err instanceof Error ? err.name : "cannot open"); // gồm PasswordException và InvalidPDFException
    }
    const ops = pdfjs.OPS as unknown as ImageOps;

    const withPage = async <T>(pageNo: number, fn: (page: Pdfjs.PDFPageProxy) => Promise<T>): Promise<T> => {
      const page = await doc.getPage(pageNo);
      try {
        return await fn(page);
      } finally {
        page.cleanup();
      }
    };

    return {
      pageCount: doc.numPages,
      extractPage: (pageNo) =>
        withPage(pageNo, async (page) => {
          const content = await page.getTextContent();
          const text = cleanPageText(joinTextItems(content.items as TextItemLike[]));
          const list = await page.getOperatorList();
          const ratio = imageAreaRatio(list.fnArray, list.argsArray, ops, page.view);
          return { pageNo, text, kind: classifyPage(text, ratio), imageAreaRatio: ratio };
        }),
      renderPng: (pageNo) =>
        withPage(pageNo, async (page) => {
          const { createCanvas } = loadCanvas();
          const viewport = page.getViewport({ scale: MATERIAL_RENDER_DPI / 72 });
          const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
          try {
            // pdf.js tự lấy context 2d của canvas và tô nền trắng
            await page.render({ canvas: canvas as unknown as RenderParams["canvas"], viewport }).promise;
            return new Uint8Array(await canvas.encode("png"));
          } finally {
            canvas.width = 0; // trả bộ nhớ điểm ảnh ngay, không đợi GC
            canvas.height = 0;
          }
        }),
      close: () => task.destroy(), // huỷ tài liệu và worker giả (giải phóng bộ nhớ của pdf.js)
    };
  },
};

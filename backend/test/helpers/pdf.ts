// PDF nhỏ dựng ngay trong test (chỉ ký tự ASCII, có bảng xref đúng): mỗi trang có thể có chữ và/hoặc một ảnh inline phủ một phần trang.

export interface FakePage {
  text?: string;
  image?: { x: number; y: number; w: number; h: number; xobject?: boolean }; // điểm PDF, trang 720x540; xobject = ảnh /XObject thay vì inline
}

export interface BuildOptions {
  encrypted?: boolean; // thêm /Encrypt (Standard) với khoá ngẫu nhiên: trình đọc phải hỏi mật khẩu
}

export function buildPdf(pages: readonly FakePage[], { encrypted = false }: BuildOptions = {}): Buffer {
  const objects: string[] = [];
  const add = (body: string) => objects.push(body); // số hiệu đối tượng = vị trí, bắt đầu từ 1

  const catalog = add("<< /Type /Catalog /Pages 2 0 R >>");
  const pagesObj = add(""); // điền sau khi biết các trang
  const font = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const kids: number[] = [];
  for (const p of pages) {
    let content = "";
    if (p.text) {
      const lines = p.text.split("\n");
      lines.forEach((line, i) => {
        const safe = line.replace(/[\\()]/g, (c) => `\\${c}`);
        content += `BT /F1 14 Tf 40 ${500 - i * 20} Td (${safe}) Tj ET\n`;
      });
    }
    let xobjects = "";
    if (p.image) {
      const { x, y, w, h, xobject } = p.image;
      if (xobject) {
        const hex = "FF000000FF000000FFFFFFFF>";
        const img = add(`<< /Type /XObject /Subtype /Image /Width 2 /Height 2 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /ASCIIHexDecode /Length ${hex.length} >>\nstream\n${hex}\nendstream`);
        xobjects = ` /XObject << /Im1 ${img} 0 R >>`;
        content += `q ${w} 0 0 ${h} ${x} ${y} cm /Im1 Do Q\n`;
      } else {
        content += `q ${w} 0 0 ${h} ${x} ${y} cm\nBI /W 2 /H 2 /CS /RGB /BPC 8 /F /AHx ID\nFF000000FF000000FFFFFFFF>\nEI\nQ\n`;
      }
    }
    const stream = add(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}endstream`);
    kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 720 540] /Resources << /Font << /F1 ${font} 0 R >>${xobjects} >> /Contents ${stream} 0 R >>`));
  }
  objects[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  const hex32 = (seed: number) => Array.from({ length: 32 }, (_, i) => ((i * 37 + seed) & 255).toString(16).padStart(2, "0")).join("");
  const id = hex32(3).slice(0, 32);
  const enc = encrypted ? ` /Encrypt << /Filter /Standard /V 1 /R 2 /O <${hex32(1)}> /U <${hex32(2)}> /P -4 >> /ID [<${id}> <${id}>]` : "";
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R${enc} >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

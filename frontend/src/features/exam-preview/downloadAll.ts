import { zipSync, type Zippable } from "fflate";
import { fetchImageBlob, fetchProtectedFile } from "@/shared/api/protectedImage";

type Item = { name: string; url: string; protectedImage?: boolean };

// Tên file hợp lệ trên Windows/macOS: bỏ ký tự cấm, rỗng thì dùng tên dự phòng
export const safeFileName = (name: string, fallback: string) => name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim().slice(0, 150) || fallback;

// Hai tệp trùng tên: thêm " (2)", " (3)"... trước phần đuôi
const uniqueName = (taken: Set<string>, name: string) => {
  const dot = name.lastIndexOf(".");
  const [base, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
  let n = name;
  for (let i = 2; taken.has(n.toLowerCase()); i++) n = `${base} (${i})${ext}`;
  taken.add(n.toLowerCase());
  return n;
};

/** Tải mọi tệp về trình duyệt, nén thành một file zip (không nén lại: ảnh, pdf, zip đã nén sẵn) và lưu với tên `<zipName>.zip`. */
export async function downloadAllAsZip(zipName: string, items: Item[]) {
  const blobs = await Promise.all(items.map((i) => (i.protectedImage ? fetchImageBlob(i.url) : fetchProtectedFile(i.url))));
  const taken = new Set<string>();
  const files: Zippable = {};
  for (const [k, item] of items.entries()) files[uniqueName(taken, safeFileName(item.name, `file-${k + 1}`))] = [new Uint8Array(await blobs[k]!.arrayBuffer()), { level: 0 }];
  // shortcut: nén trong bộ nhớ tab (đề PE vài chục MB là ổn), chuyển sang fflate Zip streaming nếu có đề hàng trăm MB
  const zip = zipSync(files);
  const blobUrl = URL.createObjectURL(new Blob([zip as BlobPart], { type: "application/zip" }));
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `${safeFileName(zipName, "de-thi")}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
}

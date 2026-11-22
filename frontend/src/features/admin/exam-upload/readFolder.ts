import type { FolderEntry } from "./folder";

// Tệp từ ô chọn thư mục (webkitdirectory): đường dẫn nằm sẵn trong webkitRelativePath
export const fromInput = (files: FileList | null): FolderEntry<File>[] =>
  Array.from(files ?? []).map((file) => ({ path: (file.webkitRelativePath || file.name).replace(/\\/g, "/"), file }));

const readBatch = (reader: FileSystemDirectoryReader) => new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
const fileOf = (entry: FileSystemFileEntry) => new Promise<File>((resolve, reject) => entry.file(resolve, reject));

async function walk(entry: FileSystemEntry, out: FolderEntry<File>[]) {
  if (entry.isFile) {
    out.push({ path: entry.fullPath.replace(/^\/+/, ""), file: await fileOf(entry as FileSystemFileEntry) });
    return;
  }
  if (!entry.isDirectory) return;
  const reader = (entry as FileSystemDirectoryEntry).createReader();
  // readEntries trả từng đợt (Chrome khoảng 100 mục), gọi tới khi rỗng
  for (let batch = await readBatch(reader); batch.length; batch = await readBatch(reader)) {
    for (const child of batch) await walk(child, out);
  }
}

// Thư mục kéo thả vào: đọc đệ quy qua webkitGetAsEntry (phải lấy entry ngay trong sự kiện drop)
export async function fromDrop(data: DataTransfer): Promise<FolderEntry<File>[]> {
  const entries = Array.from(data.items)
    .map((item) => item.webkitGetAsEntry())
    .filter((e): e is FileSystemEntry => e !== null);
  const out: FolderEntry<File>[] = [];
  for (const e of entries) await walk(e, out);
  return out;
}

// Đọc thư mục được kéo thả vào trang -> danh sách file ở cấp ngoài cùng + tên thư mục.
// (Kéo thả không có webkitRelativePath như ô chọn thư mục nên phải duyệt bằng File System Entry API.)
export async function readDroppedFolder(dt: DataTransfer): Promise<{ files: File[]; name: string } | null> {
  const entry = dt.items[0]?.webkitGetAsEntry?.();
  if (!entry?.isDirectory) return null; // chỉ nhận thư mục, không nhận file lẻ

  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const files: File[] = [];

  // readEntries trả về từng đợt (tối đa ~100 mục), gọi đến khi hết
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
    if (batch.length === 0) break;
    for (const child of batch) {
      if (child.isFile) {
        files.push(await new Promise<File>((resolve, reject) => (child as FileSystemFileEntry).file(resolve, reject)));
      }
    }
  }

  return { files, name: entry.name };
}

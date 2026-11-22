import { ACCEPTED_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_MB, MAX_IMAGES } from "./limits";

type FileLike = Pick<File, "name" | "size" | "type" | "lastModified">;

const sameFile = (a: FileLike, b: FileLike) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

/** Thêm ảnh mới vào danh sách đã chọn: bỏ ảnh sai loại, quá nặng, trùng, vượt số ảnh tối đa và báo lý do. */
export function pickImages<T extends FileLike>(current: T[], incoming: T[]): { files: T[]; error?: string } {
  const files = [...current];
  let badType = 0;
  let tooBig = 0;
  let overCap = 0;
  for (const f of incoming) {
    // Một số trình duyệt không ghi loại tệp: khi đó dựa vào đuôi (máy chủ vẫn kiểm tra byte đầu)
    if (!(ACCEPTED_TYPES.includes(f.type) || (!f.type && /\.(jpe?g|png|webp)$/i.test(f.name)))) badType++;
    else if (f.size > MAX_IMAGE_BYTES) tooBig++;
    else if (files.some((x) => sameFile(x, f))) continue;
    else if (files.length >= MAX_IMAGES) overCap++;
    else files.push(f);
  }
  const problems = [
    badType && `${badType} tệp không phải ảnh JPG, PNG hoặc WebP`,
    tooBig && `${tooBig} ảnh nặng hơn ${MAX_IMAGE_MB} MB`,
    overCap && `${overCap} ảnh vượt quá ${MAX_IMAGES} ảnh mỗi lần gửi`,
  ].filter(Boolean);
  return { files, error: problems.length ? `Đã bỏ qua: ${problems.join("; ")}.` : undefined };
}

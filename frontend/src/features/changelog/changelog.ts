import data from "./changelog.json";

export type ChangeType = "new" | "improved" | "fixed";
export interface Change {
  type: ChangeType;
  text: string;
}
export interface Release {
  version: string;
  date: string; // YYYY-MM-DD
  title: string;
  highlights: string[]; // vài ý nổi bật, dùng cho hộp thoại "Có gì mới"
  changes: Change[];
}
export type Product = "web" | "extension";

// Lịch sử phiên bản, mới nhất ở đầu. Thêm bản mới: thêm một mục lên ĐẦU mảng trong changelog.json.
export const CHANGELOG = data as unknown as Record<Product, Release[]>;

// Phiên bản hiện tại của web = bản mới nhất trong lịch sử; của tiện ích Chrome tương tự (phải khớp manifest.json, script release sẽ cảnh báo nếu lệch)
export const APP_VERSION = CHANGELOG.web[0]!.version;
export const EXTENSION_VERSION = CHANGELOG.extension[0]!.version;

export const CHANGE_LABEL: Record<ChangeType, string> = { new: "Mới", improved: "Cải thiện", fixed: "Sửa lỗi" };

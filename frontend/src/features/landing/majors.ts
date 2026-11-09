// Ngành / chuyên ngành tại FPTU (39), chia theo khối. Dùng cho dải chữ chạy ở trang chủ.
export type MajorTone = "primary" | "secondary" | "tertiary" | "neutral";

export interface MajorGroup {
  name: string;
  tone: MajorTone;
  majors: string[];
}

export const MAJOR_GROUPS: MajorGroup[] = [
  {
    name: "Công nghệ thông tin",
    tone: "primary",
    majors: [
      "Công nghệ thông tin",
      "Kỹ thuật phần mềm",
      "Trí tuệ nhân tạo",
      "Khoa học dữ liệu ứng dụng",
      "An toàn thông tin",
      "Thiết kế vi mạch bán dẫn",
      "Công nghệ ô tô số",
      "Hệ thống thông tin",
      "Thiết kế đồ hoạ và mỹ thuật số",
      "Robot và Trí tuệ nhân tạo",
    ],
  },
  {
    name: "Công nghệ truyền thông",
    tone: "secondary",
    majors: ["Truyền thông đa phương tiện", "Quan hệ công chúng", "Truyền thông Marketing tích hợp", "Truyền thông thương hiệu"],
  },
  {
    name: "Quản trị kinh doanh",
    tone: "tertiary",
    majors: [
      "Marketing",
      "Kinh doanh quốc tế",
      "Thương mại điện tử",
      "Quản trị kinh doanh",
      "Quản trị giải trí và sự kiện",
      "Quản trị trải nghiệm khách hàng",
      "Quản trị thu mua",
      "Quản trị khách sạn",
      "Quản trị dịch vụ du lịch và lữ hành",
      "Phân tích kinh doanh",
      "Logistics và Quản lý chuỗi cung ứng toàn cầu",
      "Công nghệ tài chính (Fintech)",
      "Tài chính doanh nghiệp",
      "Tài chính thông minh",
      "Tài chính ngân hàng",
    ],
  },
  {
    name: "Ngôn ngữ",
    tone: "neutral",
    majors: ["Ngôn ngữ Anh", "Tiếng Anh thương mại", "Ngôn ngữ Hàn Quốc", "Tiếng Hàn thương mại", "Ngôn ngữ Trung Quốc", "Tiếng Trung thương mại"],
  },
  { name: "Luật", tone: "secondary", majors: ["Luật", "Luật kinh tế"] },
  { name: "Khoa học máy tính", tone: "primary", majors: ["Trí tuệ nhân tạo và Khoa học dữ liệu", "An ninh mạng và an toàn số"] },
];

export const MAJOR_COUNT = MAJOR_GROUPS.reduce((n, g) => n + g.majors.length, 0);

// Ba dải chạy, mỗi dải gồm vài khối (xen kẽ để dài gần bằng nhau)
export const MARQUEE_ROWS: MajorGroup[][] = [
  [MAJOR_GROUPS[0]!, MAJOR_GROUPS[1]!],
  [MAJOR_GROUPS[2]!],
  [MAJOR_GROUPS[3]!, MAJOR_GROUPS[4]!, MAJOR_GROUPS[5]!],
];

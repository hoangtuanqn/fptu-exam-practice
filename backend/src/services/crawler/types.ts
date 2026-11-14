export interface ImageRef {
  /** URL ảnh gốc (full size) */
  url: string;
  /** Tên gốc, không đuôi. VD: "Q1" */
  name: string;
  /** Tên file duy nhất dùng để lưu (không đuôi). Khác `name` khi trùng: "Q1-2" */
  fileBase: string;
  /** Trang media của ảnh (nơi có bình luận) */
  mediaUrl?: string;
}

export interface ScrapedComment {
  id: string;
  author: string;
  /** ISO 8601 kèm múi giờ của site, VD "2026-05-04T11:31:15+0700" */
  time: string;
  /** Điểm uy tín của người viết trên forum (không phải điểm đúng/sai của đáp án) */
  authorScore?: string;
  text: string;
  url: string;
}

export interface ThreadData {
  title: string;
  /** Signature: ID thread, cố định dù URL có thêm params. VD "7094" */
  threadId: string | null;
  canonicalUrl: string | null;
  author?: string;
  postedAt?: string;
  images: ImageRef[];
  /** Tệp đính kèm không phải ảnh (pdf, zip...) */
  files: FileRef[];
}

export interface FileRef {
  /** Link tải (cần cookie) */
  url: string;
  /** Tên hiển thị trên thread, VD "paper.pdf" */
  name: string;
}

export interface QuestionComments {
  image: ImageRef;
  comments: ScrapedComment[];
}

export interface DownloadedImage {
  image: ImageRef;
  /** Tên file đã lưu, VD "Q1.webp" */
  file: string;
}

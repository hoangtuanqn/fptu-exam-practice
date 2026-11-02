export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Mọi response thành công đều có cùng một dạng
export class ResponseClient<T = unknown> {
  status = true;
  message: string;
  data?: T;
  meta?: PageMeta;

  constructor({ message = "Thành công", data, meta }: { message?: string; data?: T; meta?: PageMeta }) {
    this.message = message;
    this.data = data;
    this.meta = meta;
  }
}

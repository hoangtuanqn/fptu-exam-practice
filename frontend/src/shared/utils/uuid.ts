// Id đề và lượt làm là UUID (chuỗi 36 ký tự). Giá trị cũ dạng số (địa chỉ, bộ nhớ trình duyệt) thì bỏ qua.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

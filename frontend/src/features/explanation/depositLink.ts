// Link sang trang nạp kèm số credit còn thiếu và trang để quay lại làm bài sau khi nạp
export function depositLink(need: number, back: string) {
  const q = new URLSearchParams();
  if (need > 0) q.set("need", String(need));
  q.set("back", back);
  return `/account/deposit?${q.toString()}`;
}

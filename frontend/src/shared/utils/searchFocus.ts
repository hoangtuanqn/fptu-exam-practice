// Đang đứng ở một ô tìm kiếm (input[data-search]) thì đánh dấu lên <html>, để CSS tạm dừng hiệu ứng trang trí.
// Chỉ đổi lúc vào và ra khỏi ô, không tốn gì theo từng phím.
export function watchSearchFocus() {
  const mark = (on: boolean) => document.documentElement.toggleAttribute("data-searching", on);
  document.addEventListener("focusin", (e) => mark(e.target instanceof Element && e.target.matches("input[data-search]")));
  document.addEventListener("focusout", () => mark(false));
}

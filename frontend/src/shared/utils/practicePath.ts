// Màn hình làm bài (/exam/:examId/practice): giữ gọn, không bật hộp thoại, mascot hay nút phụ. Trang chi tiết đề /exam/:examId không tính.
export const isPracticePath = (pathname: string) => /^\/exam\/[^/]+\/practice/.test(pathname);

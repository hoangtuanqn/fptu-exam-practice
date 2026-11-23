import { Component, type ErrorInfo, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Button, buttonClass } from "./Button";

// Bắt lỗi khi vẽ một trang (kể cả lỗi tải code của trang sau khi ra bản mới): thay vì màn hình trắng, hiện thông báo kèm nút tải lại.
// resetKey đổi (ví dụ đường dẫn) thì bỏ trạng thái lỗi, để chuyển sang trang khác là dùng được ngay.
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-20 text-center">
        <CircleAlert size={36} className="text-error" />
        <h1 className="md-title-medium text-on-surface">Trang gặp sự cố</h1>
        <p className="md-body-medium text-on-surface-variant">Bạn thử tải lại trang nhé. Nếu vẫn lỗi, hãy quay về trang chủ.</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button variant="filled" onClick={() => window.location.reload()}>
            Tải lại trang
          </Button>
          <a href="/" className={buttonClass({ variant: "tonal" })}>
            Về trang chủ
          </a>
        </div>
      </div>
    );
  }
}

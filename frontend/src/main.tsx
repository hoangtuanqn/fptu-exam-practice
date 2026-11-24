import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/app/App";
import { ImpersonationBanner } from "@/features/auth/ImpersonationBanner";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ToastProvider } from "@/shared/context/ToastContext";
import { ThemeProvider } from "@/shared/theme/ThemeContext";
import { SeasonProvider } from "@/shared/season/SeasonContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <SeasonProvider>
          <ToastProvider>
            <AuthProvider>
              <App />
              <ImpersonationBanner />
            </AuthProvider>
          </ToastProvider>
        </SeasonProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);

// PWA: chỉ đăng ký service worker ở bản build, lúc dev để Vite tự nạp lại
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

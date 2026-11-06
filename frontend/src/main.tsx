import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/app/App";
import { ImpersonationBanner } from "@/features/auth/ImpersonationBanner";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ToastProvider } from "@/shared/context/ToastContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <App />
          <ImpersonationBanner />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);

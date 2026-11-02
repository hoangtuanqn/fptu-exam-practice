import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Gọi /api/... từ trình duyệt, Vite chuyển tiếp sang backend (tránh CORS khi phát triển)
  server: { proxy: { "/api": "http://localhost:8000" } },
});

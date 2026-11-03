import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { loadBrand } from "./brand.config";

export default defineConfig(({ mode }) => {
  const brand = loadBrand(loadEnv(mode, ".", "VITE_"));
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

  // Thay {{title}}, {{description}}... trong index.html bằng thông tin thương hiệu
  const brandHtml = {
    name: "brand-html",
    transformIndexHtml: (html: string) => {
      const values: Record<string, string> = {
        title: brand.title,
        description: brand.description,
        themeColor: brand.themeColor,
        ogImage: `${brand.siteUrl}/og-cover.jpg`, // có VITE_SITE_URL thì thành địa chỉ tuyệt đối
        siteName: brand.company,
      };
      return html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => esc(values[key] ?? ""));
    },
  };

  return {
    plugins: [react(), tailwindcss(), brandHtml],
    // "@/shared/ui/Button" = src/shared/ui/Button (Vite hiểu "/src" là thư mục src của dự án)
    resolve: { alias: { "@": "/src" } },
    // Gọi /api/... từ trình duyệt, Vite chuyển tiếp sang backend (tránh CORS khi phát triển)
    server: { proxy: { "/api": { target: "http://localhost:8000", ws: true } } }, // ws: kênh realtime (socket.io) đi cùng đường /api
  };
});

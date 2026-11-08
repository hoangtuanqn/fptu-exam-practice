import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { loadBrand } from "./brand.config";
import { PUBLIC_PAGES, SUBJECTS, fullTitle, subjectPath, subjectSeo } from "./seo.config";
import fs from "node:fs";
import path from "node:path";

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
        // Có VITE_SITE_URL thì thành địa chỉ tuyệt đối. Đổi ?v= khi thay ảnh để Facebook/Zalo nạp lại ảnh mới thay vì ảnh đã cache
        ogImage: `${brand.siteUrl}/og-cover.jpg?v=5`,
        siteUrl: brand.siteUrl ? `${brand.siteUrl}/` : "",
        ogImageAlt: `${brand.product}: đề thi FE từ kho ${brand.partnerName}, có đáp án, chấm điểm thang 10`,
        siteName: brand.company,
      };
      return html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => esc(values[key] ?? ""));
    },
  };

  // Sau khi build: sinh sẵn HTML riêng cho từng trang công khai (dist/pro/index.html...) với tiêu đề, mô tả, canonical riêng.
  // Facebook/Zalo và bot không chạy JS nên đọc được ngay; trình duyệt vẫn tải app như bình thường.
  const seoPages = {
    name: "seo-pages",
    apply: "build" as const,
    closeBundle() {
      const dist = path.resolve("dist");
      const base = fs.readFileSync(path.join(dist, "index.html"), "utf8");
      const setTag = (html: string, re: RegExp, tag: string) => (re.test(html) ? html.replace(re, () => tag) : html.replace("</head>", () => `  ${tag}
  </head>`));
      // Mỗi môn một trang /mon/<mã>: PUBLIC_PAGES cộng thêm các trang môn
      const pages: [string, { title: string; description: string }][] = [...Object.entries(PUBLIC_PAGES), ...SUBJECTS.map((s): [string, { title: string; description: string }] => [subjectPath(s.code), subjectSeo(s)])];
      for (const [route, seo] of pages) {
        const title = esc(fullTitle(route, seo as Parameters<typeof fullTitle>[1]));
        const desc = esc(seo.description);
        const url = brand.siteUrl ? esc(brand.siteUrl + (route === "/" ? "/" : route)) : "";
        let html = base;
        html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`);
        html = setTag(html, /<meta name="description"[^>]*>/, `<meta name="description" content="${desc}" />`);
        html = setTag(html, /<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${title}" />`);
        html = setTag(html, /<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${desc}" />`);
        html = setTag(html, /<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${title}" />`);
        html = setTag(html, /<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${desc}" />`);
        if (url) {
          html = setTag(html, /<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}" />`);
          html = setTag(html, /<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}" />`);
        }
        if (route === "/") fs.writeFileSync(path.join(dist, "index.html"), html);
        else {
          fs.mkdirSync(path.join(dist, route), { recursive: true });
          fs.writeFileSync(path.join(dist, route, "index.html"), html);
        }
      }
      // Thêm các trang môn vào sitemap (nếu có sitemap.xml): lấy domain từ chính sitemap để khỏi cấu hình thêm
      const sitemap = path.join(dist, "sitemap.xml");
      if (fs.existsSync(sitemap)) {
        const xml = fs.readFileSync(sitemap, "utf8");
        const origin = xml.match(/<loc>(https?:\/\/[^/<]+)/)?.[1];
        if (origin && !xml.includes("/mon/")) {
          const urls = SUBJECTS.map((s) => `  <url>\n    <loc>${origin}${subjectPath(s.code)}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`).join("");
          fs.writeFileSync(sitemap, xml.replace("</urlset>", () => `${urls}</urlset>`));
        }
      }
    },
  };

  return {
    plugins: [react(), tailwindcss(), brandHtml, seoPages],
    // "@/shared/ui/Button" = src/shared/ui/Button (Vite hiểu "/src" là thư mục src của dự án)
    resolve: { alias: { "@": "/src" } },
    // Gọi /api/... từ trình duyệt, Vite chuyển tiếp sang backend (tránh CORS khi phát triển)
    server: { proxy: { "/api": { target: "http://localhost:8000", ws: true } } }, // ws: kênh realtime (socket.io) đi cùng đường /api
  };
});

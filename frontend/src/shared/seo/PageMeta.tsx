import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { fullTitle, seoFor } from "../../../seo.config";
import { brand } from "@/shared/brand/brand";

function setMeta(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}
const metaByName = (name: string, content: string) =>
  setMeta(`meta[name="${name}"]`, () => Object.assign(document.createElement("meta"), { name }), "content", content);
const metaByProp = (property: string, content: string) =>
  setMeta(`meta[property="${property}"]`, () => { const m = document.createElement("meta"); m.setAttribute("property", property); return m; }, "content", content);

// Đặt tiêu đề, mô tả, canonical và robots theo từng trang mỗi khi đổi đường dẫn
export function PageMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const seo = seoFor(pathname);
    const title = fullTitle(pathname, seo);
    const url = brand.siteUrl ? brand.siteUrl + (pathname === "/" ? "/" : pathname.replace(/\/+$/, "")) : "";
    document.title = title;
    metaByName("description", seo.description);
    metaByName("robots", seo.index ? "index, follow" : "noindex, nofollow");
    metaByProp("og:title", title);
    metaByProp("og:description", seo.description);
    metaByName("twitter:title", title);
    metaByName("twitter:description", seo.description);
    if (url) {
      metaByProp("og:url", url);
      setMeta('link[rel="canonical"]', () => Object.assign(document.createElement("link"), { rel: "canonical" }), "href", url);
    }
  }, [pathname]);
  return null;
}

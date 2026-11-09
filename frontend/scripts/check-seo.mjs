// Fails the build when a page route has no title entry in seo.config.ts (the tab would show "Khong tim thay trang").
// Run by `npm run build`; also runnable by hand: node scripts/check-seo.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const app = read("src/app/App.tsx");
const admin = read("src/features/admin/admin.routes.tsx");
const seo = read("seo.config.ts");

// ---- Paths the app serves
const routes = new Set();
const lineOf = (re, text, prefix) => {
  for (const m of text.matchAll(re)) {
    const rest = text.slice(m.index, text.indexOf("\n", m.index));
    if (/Navigate|Redirect/.test(rest) && prefix !== "") continue; // redirect-only routes need no title of their own
    routes.add(prefix + m[1]);
  }
};
lineOf(/<Route path="(\/[^"]*)"/g, app, ""); // absolute paths (public pages and the /account, /admin parents)
lineOf(/<Route path="([^/"][^"]*)"/g, app, "/account/"); // relative children in App.tsx all belong to /account
lineOf(/<Route path="([^/"][^"]*)"/g, admin, "/admin/");

// Pages that are not meant to have their own title
const skip = (p) => p === "/dev/m3" || p.endsWith("*") || p.startsWith("/mon/"); // /mon/<code> titles come from seo.subjects.json

// ---- What seo.config.ts knows
const keys = new Set([...seo.matchAll(/^\s*"(\/[^"]*)":/gm)].map((m) => m[1]));
const patterns = [...seo.matchAll(/test:\s*(\/.*\/)\s*,\s*seo:/g)].map((m) => new Function(`return ${m[1]}`)());
if (patterns.length === 0) throw new Error("check-seo: could not read PATTERN_PAGES from seo.config.ts");

const missing = [...routes]
  .filter((p) => !skip(p))
  .filter((p) => (p.includes(":") ? !patterns.some((re) => re.test(p.replace(/:[^/]+/g, "x"))) : !keys.has(p)))
  .sort();

if (missing.length) {
  console.error("\x1b[31mseo.config.ts has no title for these routes (the tab would read \"Khong tim thay trang\"):\x1b[0m");
  for (const p of missing) console.error("  " + p);
  console.error("Add an entry to PRIVATE_PAGES / PUBLIC_PAGES / PATTERN_PAGES in frontend/seo.config.ts.");
  process.exit(1);
}
console.log(`\x1b[36m==> SEO titles: ${routes.size} routes checked, all have a title\x1b[0m`);

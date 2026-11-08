// Xuất danh sách môn (mã + tên) ra frontend/seo.subjects.json để lúc build web sinh sẵn một trang SEO cho từng môn (/mon/<mã>).
// Chạy lại mỗi khi nhập thêm syllabus: npm run export:subjects, rồi build lại frontend.
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/configs/prisma";

(async () => {
  const subjects = await prisma.subject.findMany({ orderBy: { code: "asc" }, select: { code: true, name: true } });
  const out = path.resolve(__dirname, "../../frontend/seo.subjects.json");
  fs.writeFileSync(out, `[${subjects.map((s) => JSON.stringify(s)).join(",\n")}]\n`);
  console.log(`Đã ghi ${subjects.length} môn vào ${out}`);
  await prisma.$disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

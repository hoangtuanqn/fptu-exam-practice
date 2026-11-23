/**
 * Import the Coursera course catalog from a JSON array (course search export) into coursera_courses.
 * Items: { course_id, course_code, course_name, course_price, ... }. Matched by code; the point price is used 1:1 as wallet credit.
 *
 *   npm run import:coursera-courses -- --file=<path to courses.json> --dry-run   read only, print the counts
 *   npm run import:coursera-courses -- --file=<path to courses.json>             write
 *   add --price=50000 to charge one flat price for every course instead of the file's prices
 *
 * Safe to re-run: new codes are created active; existing ones only get title/price updated when they differ
 * (isActive is left alone so an admin's pause sticks). Nothing is deleted. Price changes apply to future orders only.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { prisma } from "../src/configs/prisma";
import { COURSERA } from "../src/constants/coursera";
import { parseArgs } from "./lib/cli-args";

const itemSchema = z.object({
  course_code: z.string().trim().min(1).max(COURSERA.codeLength),
  course_name: z.string().trim().min(1).transform((t) => t.slice(0, COURSERA.titleLength)),
  course_price: z.coerce.number().finite().min(0).transform(Math.round).pipe(z.number().max(COURSERA.maxPrice)),
});
interface Row { code: string; title: string; price: number }

function readInput(file: string) {
  const resolved = path.resolve(file.replace(/^"(.*)"$/, "$1"));
  if (!fs.existsSync(resolved)) throw new Error(`File not found: ${resolved}`);
  const items = z.array(z.unknown()).parse(JSON.parse(fs.readFileSync(resolved, "utf8").replace(/^﻿/, "")));
  const rows = new Map<string, Row>(); // codes are unique case-insensitively (utf8mb4_unicode_ci); last one wins
  const skipped: string[] = [];
  for (const [i, item] of items.entries()) {
    const parsed = itemSchema.safeParse(item);
    if (!parsed.success) {
      skipped.push(`#${i + 1}: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message ?? "invalid"}`);
      continue;
    }
    const { course_code: code, course_name: title, course_price: price } = parsed.data;
    rows.set(code.toLowerCase(), { code, title, price });
  }
  return { resolved, total: items.length, rows: [...rows.values()], skipped };
}

async function main() {
  const args = parseArgs();
  const file = args.get("file");
  if (!file) throw new Error("Usage: npm run import:coursera-courses -- --file=<courses.json> [--dry-run]");
  const dry = args.has("dry-run");
  const flat = args.get("price");
  const flatPrice = flat === undefined ? undefined : z.coerce.number().int().min(0).max(COURSERA.maxPrice).parse(flat);
  const input = readInput(file);
  const { resolved, total, skipped } = input;
  const rows = flatPrice === undefined ? input.rows : input.rows.map((r) => ({ ...r, price: flatPrice }));
  console.log(`File: ${resolved}: ${total} items, ${rows.length} valid unique codes, ${skipped.length} skipped.`);
  for (const s of skipped.slice(0, 15)) console.log("  skipped", s);

  const existing = await prisma.courseraCourse.findMany({ where: { code: { in: rows.map((r) => r.code) } }, select: { id: true, code: true, title: true, price: true } });
  const byCode = new Map(existing.map((c) => [c.code!.toLowerCase(), c]));
  const created = rows.filter((r) => !byCode.has(r.code.toLowerCase()));
  const updated = rows.flatMap((r) => {
    const c = byCode.get(r.code.toLowerCase());
    return c && (c.title !== r.title || c.price !== r.price) ? [{ id: c.id, title: r.title, price: r.price }] : [];
  });
  const counts = `created ${created.length}, updated ${updated.length}, unchanged ${rows.length - created.length - updated.length}`;
  if (dry) return void console.log(`(--dry-run) nothing written. Would be: ${counts}.`);

  await prisma.$transaction([
    prisma.courseraCourse.createMany({ data: created.map((r) => ({ ...r, isActive: true })) }),
    ...updated.map(({ id, ...data }) => prisma.courseraCourse.update({ where: { id }, data })),
  ]);
  console.log(`Done: ${counts}.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

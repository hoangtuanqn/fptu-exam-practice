// Self-check for the bell "mark shown unread ids once on close" rule. Run: node scripts/check-bell.mjs (Node >= 23, strips TS types)
import assert from "node:assert/strict";
import { idsToMark, internalLink } from "../src/shared/ui/bellMarks.ts";

assert.equal(internalLink("/pro"), "/pro");
assert.equal(internalLink("//evil.example"), null);
assert.equal(internalLink("/\\evil.example"), null);
assert.equal(internalLink("https://evil.example"), null);
assert.equal(internalLink(null), null);

const shown = [
  { id: "a", readAt: null },
  { id: "b", readAt: "2026-11-20T00:00:00Z" },
  { id: "c", readAt: null },
];
const sent = new Set();

// Only unread ids that were shown
assert.deepEqual(idsToMark(shown, sent), ["a", "c"]);
// Second close with the same list sends nothing
["a", "c"].forEach((id) => sent.add(id));
assert.deepEqual(idsToMark(shown, sent), []);
// Nothing shown (still loading) -> nothing to mark
assert.deepEqual(idsToMark([], new Set()), []);
// A failed send is retried once its ids leave the sent set
sent.delete("c");
assert.deepEqual(idsToMark(shown, sent), ["c"]);

console.log("check-bell: ok");

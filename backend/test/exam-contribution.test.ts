import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contributionImageRel, isAllowedImageSignature, isContributionStaticPath } from "../src/utils/exam-contribution";

describe("exam contribution files", () => {
  it("names images 001.webp under contributions/<id>", () => {
    assert.equal(contributionImageRel("abc", 7), "contributions/abc/007.webp");
    assert.equal(contributionImageRel("abc", 100), "contributions/abc/100.webp");
  });

  it("blocks contributions/ from static serving however it is written", () => {
    for (const p of ["/contributions/x/001.webp", "/Contributions/x/001.webp", "/%63ontributions/x", "/avatars/../contributions/x/001.webp", "/contributions", "/%E0%A4%A"]) assert.ok(isContributionStaticPath(p), p);
    assert.ok(!isContributionStaticPath("/avatars/a.webp"));
  });

  it("accepts only JPEG, PNG and WebP magic bytes", () => {
    assert.ok(isAllowedImageSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0])));
    assert.ok(isAllowedImageSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])));
    assert.ok(isAllowedImageSignature(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 ")])));
    for (const bad of [Buffer.from("GIF89a"), Buffer.from("<svg xmlns="), Buffer.alloc(0), Buffer.from([0xff, 0xd8])]) assert.ok(!isAllowedImageSignature(bad));
  });
});

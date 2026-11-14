import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CourseraUpstreamError, fetchCourseraName, parseCourseraLink } from "../src/utils/coursera-lookup";
import { courseraCourseBody, courseraLookupBody } from "../src/rules/requests/coursera.request";

const json = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("Coursera link lookup", () => {
  it("accepts course and specialization links in canonical form", () => {
    assert.deepEqual(parseCourseraLink(" https://www.coursera.org/learn/Machine-Learning/?utm=x#top "), { kind: "course", slug: "machine-learning", url: "https://www.coursera.org/learn/machine-learning" });
    assert.deepEqual(parseCourseraLink("https://coursera.org/vi/learn/python"), { kind: "course", slug: "python", url: "https://www.coursera.org/learn/python" });
    assert.equal(parseCourseraLink("https://www.coursera.org/vi/learn/python/home/week/1?x=1")?.url, "https://www.coursera.org/learn/python");
    // Admin-entered catalog urls are stored canonically so the lookup finds (and respects) those rows.
    assert.equal(courseraCourseBody.parse({ title: "x", url: "https://coursera.org/learn/Python/?utm=x" }).url, "https://www.coursera.org/learn/python");
    assert.equal(parseCourseraLink("https://www.coursera.org/zh-tw/specializations/deep-learning")?.url, "https://www.coursera.org/specializations/deep-learning");
    assert.deepEqual(parseCourseraLink("https://www.coursera.org/professional-certificates/google-it-support"), { kind: "specialization", slug: "google-it-support", url: "https://www.coursera.org/specializations/google-it-support" });
  });
  it("rejects other hosts, schemes, credentials, ports, paths and bad slugs", () => {
    for (const url of [
      "not a url", "http://www.coursera.org/learn/python", "https://coursera.org.evil.invalid/learn/python", "https://evil.invalid/learn/python",
      "https://user:pass@coursera.org/learn/python", "https://coursera.org:444/learn/python", "https://www.coursera.org/learn/", "https://www.coursera.org/browse/python",
      "https://www.coursera.org/learn/-bad", "https://www.coursera.org/learn/bad_slug", `https://www.coursera.org/learn/${"a".repeat(129)}`,
      "https://www.coursera.org/xx/yy/learn/python", "javascript:alert(1)",
    ]) assert.equal(parseCourseraLink(url), null, url);
  });
  it("validates the body and lets admins set listed", () => {
    assert.equal(courseraLookupBody.safeParse({ url: "x".repeat(501) }).success, false);
    assert.equal(courseraLookupBody.safeParse({ url: "  " }).success, false);
    assert.equal(courseraCourseBody.parse({ title: "Course", listed: false }).listed, false);
    assert.equal(courseraCourseBody.parse({ title: "Course" }).listed, undefined);
  });
  it("returns the name, queries the right endpoint without following redirects, and handles not found", async () => {
    const link = parseCourseraLink("https://www.coursera.org/specializations/deep-learning")!;
    let seen: { url: string; init?: RequestInit } | undefined;
    const fetcher = (async (url: string, init?: RequestInit) => { seen = { url, init }; return json({ elements: [{ name: " Deep Learning ", slug: "deep-learning" }] })(); }) as typeof fetch;
    assert.equal(await fetchCourseraName(link, fetcher), "Deep Learning");
    assert.match(seen!.url, /^https:\/\/api\.coursera\.org\/api\/onDemandSpecializations\.v1\?q=slug&slug=deep-learning&fields=name%2Cslug$/);
    assert.equal(seen!.init?.redirect, "error");
    assert.ok(seen!.init?.signal);
    assert.equal(await fetchCourseraName(link, json({ elements: [] }) as typeof fetch), null);
    assert.equal(await fetchCourseraName(link, json({}, 404) as typeof fetch), null);
    assert.equal(await fetchCourseraName(link, json({ elements: [{ name: "Other", slug: "other" }] }) as typeof fetch), null);
  });
  it("throws an upstream error on failures, bad JSON or oversized bodies", async () => {
    const link = parseCourseraLink("https://www.coursera.org/learn/python")!;
    const failing = [
      (async () => { throw new Error("timeout"); }),
      json({}, 500),
      async () => new Response("<html>", { status: 200 }),
      json({ elements: "x" }),
      async () => new Response(JSON.stringify({ elements: [], pad: "x".repeat(70 * 1024) }), { status: 200 }),
    ];
    for (const fetcher of failing) await assert.rejects(fetchCourseraName(link, fetcher as typeof fetch), CourseraUpstreamError);
  });
});

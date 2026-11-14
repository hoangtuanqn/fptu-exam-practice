import { COURSERA } from "../constants/coursera";

export type CourseraKind = "course" | "specialization";
export interface CourseraLink { kind: CourseraKind; slug: string; url: string }

const SEGMENTS: Record<string, CourseraKind> = { learn: "course", specializations: "specialization", "professional-certificates": "specialization" };
const SLUG = /^[a-z0-9][a-z0-9-]{0,127}$/i;
const LOCALE = /^[a-z]{2}(-[a-z]{2,4})?$/i;
const API = "https://api.coursera.org/api";
const ENDPOINTS: Record<CourseraKind, string> = { course: "courses.v1", specialization: "onDemandSpecializations.v1" };

/** Parses a member-pasted Coursera link into its canonical form, or null when it is not a course/specialization link. */
export function parseCourseraLink(raw: string): CourseraLink | null {
  let url: URL;
  try { url = new URL(raw.trim()); } catch { return null; }
  if (url.protocol !== "https:" || !["coursera.org", "www.coursera.org"].includes(url.hostname) || url.username || url.password || url.port) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length >= 3 && LOCALE.test(parts[0]!) && (SEGMENTS[parts[1]!] || parts[1] === "organizations")) parts.shift();
  // Organization-scoped links (/organizations/<org>/learn/<slug>) point at the same public course.
  if (parts[0] === "organizations" && parts.length >= 4 && SLUG.test(parts[1]!) && SEGMENTS[parts[2]!]) parts.splice(0, 2);
  // Links copied from inside a course (/learn/<slug>/home/week/1) still name the same course.
  if (parts.length < 2 || (parts.length > 2 && !SEGMENTS[parts[0]!])) return null;
  const [segment, slug] = parts as [string, string];
  const kind = SEGMENTS[segment];
  if (!kind || !SLUG.test(slug)) return null;
  const lower = slug.toLowerCase();
  // One canonical page per course: a professional certificate and its specialization share a slug and an API record.
  return { kind, slug: lower, url: `https://www.coursera.org/${kind === "course" ? "learn" : "specializations"}/${lower}` };
}

export class CourseraUpstreamError extends Error {}

async function readCapped(res: Response, cap: number) {
  if (Number(res.headers.get("content-length") ?? 0) > cap) throw new CourseraUpstreamError("too large");
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > cap) { await reader.cancel(); throw new CourseraUpstreamError("too large"); }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Looks up the course name on Coursera's public, unofficial, keyless catalog API.
 * Returns null when Coursera has no such slug; throws CourseraUpstreamError when the API is unusable.
 */
export async function fetchCourseraName(link: CourseraLink, fetcher: typeof fetch = fetch): Promise<string | null> {
  const query = new URLSearchParams({ q: "slug", slug: link.slug, fields: "name,slug" });
  let res: Response;
  try {
    res = await fetcher(`${API}/${ENDPOINTS[link.kind]}?${query}`, { redirect: "error", headers: { Accept: "application/json" }, signal: AbortSignal.timeout(COURSERA.lookupTimeoutMs) });
  } catch { throw new CourseraUpstreamError("request failed"); }
  if (res.status === 404) return null;
  if (!res.ok) throw new CourseraUpstreamError(`status ${res.status}`);
  let body: unknown;
  try { body = JSON.parse(await readCapped(res, COURSERA.lookupMaxBytes)); } catch (error) {
    throw error instanceof CourseraUpstreamError ? error : new CourseraUpstreamError("bad json");
  }
  const elements = (body as { elements?: unknown } | null)?.elements;
  if (!Array.isArray(elements)) throw new CourseraUpstreamError("bad shape");
  const first = elements[0] as { name?: unknown; slug?: unknown } | undefined;
  if (!first || typeof first.slug !== "string" || first.slug.toLowerCase() !== link.slug) return null;
  const name = typeof first.name === "string" ? first.name.trim() : "";
  if (!name) throw new CourseraUpstreamError("no name");
  return name.slice(0, COURSERA.titleLength);
}

import { ExtractError } from "./errors.js";
import { extractLinks, parseHtml, type PageContent } from "./html.js";
import { fetchPage, type FetchDeps } from "./safeFetch.js";
import { isSocialUrl, looksBlocked } from "./social.js";

export const LIMITS = { maxPages: 4, totalMs: 15_000, perPageMs: 6_000, maxBytes: 500_000 };

const INTERESTING = /about|contact|service|class|team|instructor|teacher|staff|schedule|location|studio|program/i;
const sameSite = (a: string, b: string) => new URL(a).hostname.replace(/^www\./, "") === new URL(b).hostname.replace(/^www\./, "");

/** Minimal robots.txt check for `User-agent: *` Disallow rules. */
export function robotsAllows(robots: string, path: string): boolean {
  let applies = false;
  for (const raw of robots.split("\n")) {
    const line = raw.split("#")[0].trim();
    const [k, ...rest] = line.split(":");
    const v = rest.join(":").trim();
    if (/^user-agent$/i.test(k)) applies = v === "*";
    else if (applies && /^disallow$/i.test(k) && v && path.startsWith(v)) return false;
  }
  return true;
}

export interface CrawlResult {
  pages: PageContent[];
  warnings: string[];
}

export async function crawlSite(startUrl: string, deps: FetchDeps = {}): Promise<CrawlResult> {
  const deadline = Date.now() + LIMITS.totalMs;
  const opts = (kind: "html" | "text" = "html") => ({
    kind,
    maxBytes: LIMITS.maxBytes,
    timeoutMs: Math.max(500, Math.min(LIMITS.perPageMs, deadline - Date.now())),
  });
  const warnings: string[] = [];

  const social = isSocialUrl(startUrl);
  const blockedMsg = "That page needs a login or blocks automated access, so we can't read it. Paste the business text from the page, or enter details manually.";

  let home;
  try {
    home = await fetchPage(startUrl, opts(), deps); // throws ExtractError on failure
  } catch (e) {
    // Never work around a social site's login or bot protection: hand over to paste/manual entry.
    if (social && e instanceof ExtractError && e.code === "extraction_failed") throw new ExtractError("source_blocked", blockedMsg, 422);
    throw e;
  }
  const origin = new URL(home.url).origin;

  let robots = "";
  try {
    robots = (await fetchPage(`${origin}/robots.txt`, opts("text"), deps)).body;
  } catch {
    /* no robots.txt: allowed */
  }
  if (!robotsAllows(robots, new URL(home.url).pathname || "/")) {
    throw new ExtractError(social ? "source_blocked" : "extraction_failed", "That website asks not to be automatically read. Paste the business text instead, or enter details manually.", 422);
  }

  const pages: PageContent[] = [parseHtml(home.url, home.body)];
  if (social) {
    // A single public page only: no link crawling on social sites, and a login wall is a stop, not an obstacle to bypass.
    if (looksBlocked(pages[0].text)) throw new ExtractError("source_blocked", blockedMsg, 422);
    return { pages, warnings };
  }
  const seen = new Set([home.url.replace(/\/$/, "")]);

  const candidates = extractLinks(home.url, home.body)
    .filter((l) => sameSite(l.url, home.url) && INTERESTING.test(l.url + " " + l.label))
    .filter((l) => !/\.(pdf|jpe?g|png|gif|zip|docx?)$/i.test(new URL(l.url).pathname))
    .sort((a, b) => Number(/contact|about/i.test(b.url + b.label)) - Number(/contact|about/i.test(a.url + a.label)));

  for (const c of candidates) {
    if (pages.length >= LIMITS.maxPages || Date.now() >= deadline) break;
    const key = c.url.replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    if (!robotsAllows(robots, new URL(c.url).pathname)) continue;
    try {
      const p = await fetchPage(c.url, opts(), deps);
      if (!sameSite(p.url, home.url)) continue; // redirect left the site
      pages.push(parseHtml(p.url, p.body));
    } catch {
      warnings.push(`Couldn't read ${new URL(c.url).pathname}; continuing with the other pages.`);
    }
  }
  return { pages, warnings };
}

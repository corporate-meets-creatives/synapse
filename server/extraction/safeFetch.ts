import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { ExtractError } from "./errors.js";
import { isPublicIp } from "./ip.js";

export interface Resolved {
  address: string;
  family: 4 | 6;
}
export interface RawResponse {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
}
export type Resolver = (hostname: string) => Promise<Resolved[]>;
/** Performs one HTTP request to a pre-validated IP. Never follows redirects. */
export type Transport = (url: URL, target: Resolved, opts: { timeoutMs: number; maxBytes: number; accept: string }) => Promise<RawResponse>;

export interface FetchDeps {
  resolve?: Resolver;
  transport?: Transport;
}
export interface FetchOpts {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  kind?: "html" | "text";
}
export interface FetchedPage {
  url: string; // final URL after redirects
  status: number;
  body: string;
}

const USER_AGENT = "SynapseProfileImporter/1.0 (+owner-initiated website import)";

const defaultResolver: Resolver = async (hostname) => {
  const res = await dns.lookup(hostname, { all: true, verbatim: true });
  return res.map((r) => ({ address: r.address, family: r.family as 4 | 6 }));
};

const defaultTransport: Transport = (url, target, { timeoutMs, maxBytes, accept }) =>
  new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      {
        method: "GET",
        timeout: timeoutMs,
        headers: { "user-agent": USER_AGENT, accept, "accept-encoding": "identity" },
        // Pin the connection to the address we already validated (no second DNS lookup).
        lookup: ((_h: string, o: { all?: boolean }, cb: (...a: unknown[]) => void) =>
          o?.all ? cb(null, [target]) : cb(null, target.address, target.family)) as never,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          size += c.length;
          if (size > maxBytes) {
            chunks.push(c.subarray(0, c.length - (size - maxBytes)));
            res.destroy(); // truncate: use what we have
          } else chunks.push(c);
        });
        const done = () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: Object.fromEntries(Object.entries(res.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v ?? "")])),
            body: Buffer.concat(chunks),
          });
        res.on("end", done);
        res.on("close", done);
        res.on("error", done);
      },
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });

/**
 * Validate a URL is a public http(s) destination and return the validated address to connect to.
 * Throws ExtractError("blocked_url") otherwise.
 */
export async function assertPublicUrl(raw: string | URL, resolve: Resolver = defaultResolver): Promise<{ url: URL; target: Resolved }> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ExtractError("bad_request", "That doesn't look like a valid web address.", 400);
  }
  const blocked = (why: string) => new ExtractError("blocked_url", `That address can't be imported (${why}). Enter your details manually instead.`, 400);

  if (url.protocol !== "http:" && url.protocol !== "https:") throw blocked("only http and https are allowed");
  if (url.username || url.password) throw blocked("credentials in URLs are not allowed");
  if (url.port && !["80", "443"].includes(url.port)) throw blocked("unusual port");

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localdomain")) {
    throw blocked("local address");
  }

  if (isIP(host)) {
    if (!isPublicIp(host)) throw blocked("private network address");
    return { url, target: { address: host, family: isIP(host) as 4 | 6 } };
  }

  let addrs: Resolved[];
  try {
    addrs = await resolve(host);
  } catch {
    throw new ExtractError("extraction_failed", "We couldn't find that website. Check the address or enter your details manually.", 422);
  }
  if (!addrs.length) throw new ExtractError("extraction_failed", "We couldn't find that website. Enter your details manually.", 422);
  // Every resolved address must be public (defends against mixed public/private DNS answers).
  if (addrs.some((a) => !isPublicIp(a.address))) throw blocked("private network address");
  return { url, target: addrs[0] };
}

/** Fetch one public page. Re-validates the destination at every redirect hop. */
export async function fetchPage(raw: string, opts: FetchOpts = {}, deps: FetchDeps = {}): Promise<FetchedPage> {
  const { timeoutMs = 6000, maxBytes = 500_000, maxRedirects = 3, kind = "html" } = opts;
  const resolve = deps.resolve ?? defaultResolver;
  const transport = deps.transport ?? defaultTransport;
  const accept = kind === "html" ? "text/html,application/xhtml+xml" : "text/plain";

  let current = raw;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const { url, target } = await assertPublicUrl(current, resolve);
    let res: RawResponse;
    try {
      res = await transport(url, target, { timeoutMs, maxBytes, accept });
    } catch {
      throw new ExtractError("extraction_failed", "We couldn't load that website (it may be down or too slow). Enter your details manually.", 422);
    }
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers["location"];
      if (!loc) throw new ExtractError("extraction_failed", "The website redirected us somewhere we couldn't follow.", 422);
      current = new URL(loc, url).toString(); // validated again at top of loop
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      throw new ExtractError("extraction_failed", "That website needs a login or blocks automated access. Enter your details manually.", 422);
    }
    if (res.status < 200 || res.status >= 300) {
      throw new ExtractError("extraction_failed", `The website returned an error (${res.status}). Enter your details manually.`, 422);
    }
    const type = (res.headers["content-type"] ?? "").toLowerCase();
    if (kind === "html" && !/text\/html|application\/xhtml/.test(type)) {
      throw new ExtractError("extraction_failed", "That address doesn't look like a web page. Enter your details manually.", 422);
    }
    return { url: url.toString(), status: res.status, body: res.body.toString("utf8") };
  }
  throw new ExtractError("extraction_failed", "The website redirected too many times.", 422);
}

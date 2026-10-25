export interface PageContent {
  url: string;
  title: string;
  text: string; // visible text, truncated
  contacts: string[]; // mailto:/tel: values
  jsonLd: string; // schema.org blocks, truncated
}

const MAX_TEXT = 8000;
const MAX_JSONLD = 3000;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Math.min(Number(n), 0x10ffff)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Math.min(parseInt(n, 16), 0x10ffff)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

export function parseHtml(url: string, html: string): PageContent {
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim()).slice(0, 200);

  const jsonLd = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => m[1].trim())
    .join("\n")
    .slice(0, MAX_JSONLD);

  const contacts = [...html.matchAll(/href\s*=\s*["'](mailto:|tel:)([^"'?]+)/gi)].map((m) => `${m[1]}${decode(m[2]).trim()}`);

  const text = decode(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<(script|style|noscript|svg|iframe|template)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6]|tr|br|section|header|footer)>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v\u00a0]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim()
    .slice(0, MAX_TEXT);

  return { url, title, text, contacts: [...new Set(contacts)].slice(0, 10), jsonLd };
}

/** Same-site links (href + anchor text) on a page. */
export function extractLinks(baseUrl: string, html: string): { url: string; label: string }[] {
  const out: { url: string; label: string }[] = [];
  for (const m of html.matchAll(/<a\s[^>]*href\s*=\s*["']([^"'#]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const u = new URL(decode(m[1]), baseUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      out.push({ url: u.toString(), label: decode(m[2].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim().slice(0, 80) });
    } catch {
      /* ignore malformed href */
    }
  }
  return out;
}

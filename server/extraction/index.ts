import { StudioProfileInput, type ExtractResponse } from "../../shared/schemas.js";
import { z } from "zod";
import { callClaude, ModelOutput, type CallModel } from "./claude.js";
import { crawlSite } from "./crawl.js";
import { ExtractError } from "./errors.js";
import type { PageContent } from "./html.js";
import type { FetchDeps } from "./safeFetch.js";
import { isSocialUrl } from "./social.js";

export const MAX_PASTED_CHARS = 20_000;
const PASTED = "pasted:text"; // pseudo-source for owner-pasted text (no URL to link)

const EXPECTED = ["name", "category", "description", "address", "city", "state", "phone", "email", "contactName", "services", "danceStyles", "classTypes", "schedulingPlatform", "hasLiabilityInsurance"];
// Verified against page text so the model can't invent contact facts.
const MUST_APPEAR = ["name", "address", "city", "state", "phone", "email", "contactName", "schedulingPlatform", "website"] as const;
// Fields not in the shared StudioProfileInput yet: validated here. (Ask the schema owner to add them.)
const EXTRA = {
  category: z.string().max(200),
  services: z.array(z.string().max(100)).max(30),
} as const;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const digits = (s: string) => s.replace(/\D/g, "");

function appears(field: string, value: string, p: PageContent): boolean {
  const hay = `${p.title}\n${p.text}\n${p.contacts.join(" ")}\n${p.jsonLd}`;
  if (field === "phone") return digits(hay).includes(digits(value).replace(/^1(?=\d{10}$)/, ""));
  return norm(hay).includes(norm(value));
}

export function normalizeUrl(input: string): string {
  const t = input.trim();
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(t) ? t : `https://${t}`;
}

export interface ExtractDeps extends FetchDeps {
  callModel?: CallModel;
}
/** Either a public website/social URL, or text the owner pasted from their page. */
export type ExtractInput = { url?: unknown; text?: unknown };

export async function runExtraction(input: ExtractInput | string, deps: ExtractDeps = {}): Promise<ExtractResponse> {
  const { url, text } = typeof input === "string" ? { url: input, text: undefined } : input;
  const hasText = typeof text === "string" && text.trim().length > 0;
  let pages: PageContent[];
  let warnings: string[] = [];
  let startUrl: string | null = null;

  if (hasText) {
    if ((text as string).length > MAX_PASTED_CHARS) throw new ExtractError("payload_too_large", `That text is too long. Paste up to ${MAX_PASTED_CHARS.toLocaleString()} characters.`, 413);
    pages = [{ url: PASTED, title: "", text: (text as string).slice(0, MAX_PASTED_CHARS), contacts: [], jsonLd: "" }];
  } else {
    const parsed = z.url().safeParse(typeof url === "string" ? normalizeUrl(url) : url);
    if (!parsed.success) throw new ExtractError("bad_request", "Enter a valid website or social page address, like https://yourstudio.com, or paste your business text.", 400);
    startUrl = parsed.data;
    ({ pages, warnings } = await crawlSite(startUrl, deps));
  }
  const social = startUrl !== null && isSocialUrl(startUrl);
  const pagesRead = pages.filter((p) => p.url !== PASTED).map((p) => p.url);
  const byUrl = new Map(pages.map((p) => [p.url, p]));

  const raw = await (deps.callModel ?? callClaude)(pages);
  const out = ModelOutput.safeParse(raw);
  if (!out.success) throw new ExtractError("extraction_failed", "We couldn't read business details from that source. Paste the business text instead, or enter details manually.", 422);

  // A social page is not the business's website; only a website the page itself states is used.
  const profile: Record<string, unknown> = startUrl && !social ? { website: pages[0].url } : {};
  const fieldMeta: Record<string, { source?: string; provenance: "ai_draft" }> = {};
  const shape = StudioProfileInput.shape as Record<string, { safeParse: (v: unknown) => { success: boolean; data?: unknown } }>;

  for (const [field, entry] of Object.entries(out.data.fields)) {
    if (!entry) continue;
    if (field === "website" && profile.website) continue;
    // Pasted text has one source; for URLs the source must be a page we actually fetched.
    const page = hasText ? pages[0] : byUrl.get(entry.sourceUrl);
    if (!page) continue;
    const value = Array.isArray(entry.value) ? entry.value.map((v) => v.trim()).filter(Boolean) : entry.value.trim();
    if (Array.isArray(value) ? !value.length : !value) continue;
    if (typeof value === "string" && (MUST_APPEAR as readonly string[]).includes(field) && !appears(field, value, page)) continue;
    const validator = (EXTRA as Record<string, z.ZodType>)[field] ?? shape[field];
    const ok = validator?.safeParse(value);
    if (!ok?.success) continue; // e.g. malformed email: leave blank
    profile[field] = ok.data;
    fieldMeta[field] = page.url === PASTED ? { provenance: "ai_draft" } : { source: page.url, provenance: "ai_draft" };
  }
  if (Object.keys(fieldMeta).length) profile.fieldMeta = fieldMeta;

  return {
    profile: profile as ExtractResponse["profile"],
    missingFields: EXPECTED.filter((f) => profile[f] === undefined),
    pagesRead,
    ...(warnings.length ? { warnings } : {}),
  } as ExtractResponse;
}

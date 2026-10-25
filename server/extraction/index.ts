import { ExtractRequest, StudioProfileInput, type ExtractResponse } from "../../shared/schemas.js";
import { callClaude, ModelOutput, type CallModel } from "./claude.js";
import { crawlSite } from "./crawl.js";
import { ExtractError } from "./errors.js";
import type { PageContent } from "./html.js";
import type { FetchDeps } from "./safeFetch.js";

const EXPECTED = ["name", "address", "city", "state", "phone", "email", "contactName", "danceStyles", "classTypes", "schedulingPlatform", "description", "hasLiabilityInsurance"];
// Verified against page text so the model can't invent contact facts.
const MUST_APPEAR = ["name", "address", "city", "state", "phone", "email", "contactName", "schedulingPlatform"] as const;

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

export async function runExtraction(rawUrl: unknown, deps: ExtractDeps = {}): Promise<ExtractResponse> {
  const parsed = ExtractRequest.safeParse({ url: typeof rawUrl === "string" ? normalizeUrl(rawUrl) : rawUrl });
  if (!parsed.success) throw new ExtractError("bad_request", "Enter a valid website address, like https://yourstudio.com.", 400);

  const { pages } = await crawlSite(parsed.data.url, deps);
  const pagesRead = pages.map((p) => p.url);
  const byUrl = new Map(pages.map((p) => [p.url, p]));

  const raw = await (deps.callModel ?? callClaude)(pages);
  const out = ModelOutput.safeParse(raw);
  if (!out.success) throw new ExtractError("extraction_failed", "We couldn't read business details from that website. Enter your details manually.", 422);

  const profile: Record<string, unknown> = { website: pages[0].url };
  const fieldMeta: Record<string, { source: string; provenance: "ai_draft" }> = {};
  const shape = StudioProfileInput.shape as Record<string, { safeParse: (v: unknown) => { success: boolean; data?: unknown } }>;

  for (const [field, entry] of Object.entries(out.data.fields)) {
    if (!entry) continue;
    const page = byUrl.get(entry.sourceUrl);
    if (!page) continue; // source must be a page we actually fetched
    const value = Array.isArray(entry.value) ? entry.value.map((v) => v.trim()).filter(Boolean) : entry.value.trim();
    if (Array.isArray(value) ? !value.length : !value) continue;
    if (typeof value === "string" && (MUST_APPEAR as readonly string[]).includes(field) && !appears(field, value, page)) continue;
    const ok = shape[field]?.safeParse(value);
    if (!ok?.success) continue; // e.g. malformed email: leave blank
    profile[field] = ok.data;
    fieldMeta[field] = { source: page.url, provenance: "ai_draft" };
  }
  if (Object.keys(fieldMeta).length) profile.fieldMeta = fieldMeta;

  return {
    profile: profile as ExtractResponse["profile"],
    missingFields: EXPECTED.filter((f) => profile[f] === undefined),
    pagesRead,
  };
}

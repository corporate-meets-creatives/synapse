import { fetchPage } from "../extraction/safeFetch.js";
import type { AnswerField, FormDef } from "./types.js";

/** Pre-fill links are only built for these official hosts. */
const ALLOWED = [{ host: "docs.google.com", prefix: "/forms/" }];

export type PrefillStatus = "ok" | "unverified" | "form_changed" | "not_supported";
export interface PrefillReport {
  filled: { questionId: string; label: string }[];
  skipped: { questionId: string; label: string; reason: "blank" | "unreviewed_ai_draft" | "portal_only" | "no_prefill_field" }[];
  failed: { questionId: string; label: string; reason: "not_an_option" }[];
}
export interface PrefillResult extends PrefillReport {
  url: string | null;
  status: PrefillStatus;
  message: string | null;
  checkedAt: string | null;
}

export const isAllowedFormUrl = (url: string | undefined): boolean => {
  try {
    const u = new URL(url ?? "");
    return u.protocol === "https:" && ALLOWED.some((a) => u.hostname === a.host && u.pathname.startsWith(a.prefix));
  } catch {
    return false;
  }
};

/** Builds the link and a report of what went in, what was left, and what couldn't be used. Never submits anything. */
export function buildPrefill(form: FormDef, answers: AnswerField[]): Pick<PrefillResult, "url" | "filled" | "skipped" | "failed"> {
  const report: PrefillReport = { filled: [], skipped: [], failed: [] };
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  const params = new URLSearchParams({ usp: "pp_url" });
  for (const q of form.questions) {
    const a = byId.get(q.id);
    const base = { questionId: q.id, label: q.label };
    if (q.sensitive || q.declaration) report.skipped.push({ ...base, reason: "portal_only" });
    else if (!q.googleEntryId) report.skipped.push({ ...base, reason: "no_prefill_field" });
    else if (!a?.answer.trim()) report.skipped.push({ ...base, reason: "blank" });
    else if (a.provenance === "ai_draft") report.skipped.push({ ...base, reason: "unreviewed_ai_draft" }); // only reviewed answers go in
    else if (q.options?.length && !q.options.includes(a.answer.trim())) report.failed.push({ ...base, reason: "not_an_option" });
    else {
      params.append(q.googleEntryId, a.answer.trim());
      report.filled.push(base);
    }
  }
  const ok = form.submissionMethod === "google_form_prefill" && isAllowedFormUrl(form.formUrl) && report.filled.length > 0;
  return { url: ok ? `${form.formUrl}?${params.toString()}` : null, ...report };
}

// ---------- detecting a changed form ----------
/** Every question entry id (and whether it is required) in a public Google Form page. */
export function parseEntryIds(html: string): string[] | null {
  const m = html.match(/FB_PUBLIC_LOAD_DATA_ = (.*?);<\/script>/s);
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]) as unknown[][];
    const qs = (data[1]?.[1] ?? []) as unknown[][];
    const ids: string[] = [];
    for (const q of qs) for (const e of ((q?.[4] ?? []) as unknown[][])) if (e?.[0] !== undefined) ids.push(`entry.${String(e[0])}`);
    return ids;
  } catch {
    return null;
  }
}

export type FetchHtml = (url: string) => Promise<string>;
const defaultFetch: FetchHtml = async (url) => (await fetchPage(url, { kind: "html", timeoutMs: 6000, maxBytes: 1_500_000 })).body;

const cache = new Map<string, { at: number; result: { status: PrefillStatus; message: string | null } }>();
const TTL_MS = 10 * 60 * 1000;

/**
 * Compares the live form with the question ids we mapped. A changed form means a pre-filled link could land in the wrong
 * place, so the caller stops offering it. If the form can't be read we say so but do not pretend it changed.
 */
export async function verifyFormStructure(form: FormDef, fetchHtml: FetchHtml = defaultFetch): Promise<{ status: PrefillStatus; message: string | null }> {
  if (!form.formUrl || !isAllowedFormUrl(form.formUrl)) return { status: "not_supported", message: "This form can't be pre-filled." };
  const hit = cache.get(form.formUrl);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.result;

  let result: { status: PrefillStatus; message: string | null };
  const expected = form.structureSnapshot?.entryIds;
  try {
    const live = parseEntryIds(await fetchHtml(form.formUrl));
    if (!live || !expected) result = { status: "unverified", message: "We couldn't confirm the form hasn't changed. Check the pre-filled answers before submitting." };
    else {
      const a = new Set(live), b = new Set(expected);
      const same = a.size === b.size && [...a].every((x) => b.has(x));
      result = same ? { status: "ok", message: null } : { status: "form_changed", message: `${form.title} appears to have changed its form, so we won't pre-fill it. Copy your answers and use the official link instead.` };
    }
  } catch {
    result = { status: "unverified", message: "We couldn't reach the form to confirm it hasn't changed. Check the pre-filled answers before submitting." };
  }
  if (result.status !== "unverified") cache.set(form.formUrl, { at: Date.now(), result }); // don't cache failures to read
  return result;
}
export const _clearPrefillCache = () => cache.clear();

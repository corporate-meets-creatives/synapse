import { buildDraft } from "./draft.js";
import { DraftInputError, getForm, listForms } from "./form.js";
import type { CallNarrative } from "./narrative.js";
import type { FetchHtml } from "./prefill.js";
import { DraftRequest, type DraftResponse } from "./types.js";

export { DraftInputError, getForm, listForms };

export async function runDraft(body: unknown, call?: CallNarrative, fetchHtml?: FetchHtml): Promise<DraftResponse> {
  const parsed = DraftRequest.safeParse(body);
  if (!parsed.success) throw new DraftInputError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  return buildDraft(parsed.data, call, fetchHtml);
}

import { confirmedValue as readConfirmed, isStudioFieldConfirmed } from "./confirm.js";
import { DraftInputError, getForm } from "./form.js";
import { draftNarratives, type CallNarrative, type Facts } from "./narrative.js";
import type { AnswerField, DraftRequest, DraftResponse, FormDef, Question } from "./types.js";

const blank = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);
const toText = (v: unknown): string => (typeof v === "boolean" ? (v ? "Yes" : "No") : Array.isArray(v) ? v.join(", ") : String(v));

/**
 * Google Forms prefill link. The owner opens it, reviews, and submits on Google's page.
 * Unreviewed AI drafts are left out; once the owner edits/keeps an answer (owner_edited) a new draft call includes it.
 */
export function buildPrefillUrl(form: FormDef, answers: AnswerField[]): string | null {
  if (form.submissionMethod !== "google_form_prefill" || !form.formUrl) return null;
  const byId = new Map(answers.filter((a) => a.provenance !== "ai_draft").map((a) => [a.questionId, a.answer]));
  const params = new URLSearchParams({ usp: "pp_url" });
  let n = 0;
  for (const q of form.questions) {
    const v = byId.get(q.id)?.trim();
    if (q.googleEntryId && v) {
      params.append(q.googleEntryId, v);
      n++;
    }
  }
  return n ? `${form.formUrl}?${params.toString()}` : null;
}

export async function buildDraft(req: DraftRequest, call?: CallNarrative): Promise<DraftResponse> {
  const form = getForm(req.providerId);
  const warnings: string[] = [];
  const version = req.formVersion ?? form.version;
  if (version !== form.version) warnings.push(`Form version changed (${version} -> ${form.version}); answers were matched by question id.`);

  const usesInstructor = form.applicantType === "instructor";
  if (usesInstructor && !req.instructor) throw new DraftInputError("This form is instructor-specific: provide exactly one instructor.");
  const instructor = usesInstructor ? req.instructor : undefined; // studio-level forms never see instructor data

  // Facts available to prefill: only what the owner confirmed.
  const profile = { studio: req.studio as Record<string, unknown>, instructor: (instructor ?? {}) as Record<string, unknown>, studioConfirmed: req.studioConfirmed };
  const studioConfirmed = (field: string) => isStudioFieldConfirmed(profile, field);
  const confirmedValue = (path: string): unknown => readConfirmed(profile, path);

  const existing = new Map(req.existingAnswers.map((a) => [a.questionId, a]));
  const regen = new Set(req.regenerateQuestionIds);
  const out = new Map<string, AnswerField>();
  const needDraft: Question[] = [];

  for (const q of form.questions) {
    const prior = existing.get(q.id);
    const mine = (answer: string, provenance: AnswerField["provenance"]): AnswerField => ({ questionId: q.id, answer, provenance, needsInput: false });
    const empty = (): AnswerField => ({ ...mine("", "owner_confirmed"), needsInput: q.required });

    // Tax/banking and declarations are never filled: the owner completes them in the provider portal.
    if (q.sensitive || q.declaration) {
      out.set(q.id, mine("", "owner_confirmed"));
      continue;
    }
    // Preserve owner edits (and earlier AI drafts) unless this question is explicitly regenerated.
    if (prior && !regen.has(q.id) && prior.answer.trim() !== "" && (prior.provenance === "owner_edited" || prior.provenance === "ai_draft")) {
      out.set(q.id, prior);
      continue;
    }
    if (q.profileField) {
      const v = confirmedValue(q.profileField);
      let text = blank(v) ? "" : toText(v);
      // A choice question only accepts one of its listed options; otherwise leave it for the owner.
      if (text && q.options && !q.options.includes(text)) text = "";
      if (text) {
        out.set(q.id, mine(text, "owner_confirmed"));
        continue;
      }
      if (!q.draftable) {
        out.set(q.id, empty());
        continue;
      }
    }
    if (q.draftable) {
      needDraft.push(q);
      out.set(q.id, { ...mine("", "ai_draft"), needsInput: q.required });
      continue;
    }
    out.set(q.id, empty());
  }

  // Narrative drafting: one Claude call, confirmed non-contact facts only.
  const narrativeFacts: Facts = {
    studioDescription: studioConfirmed("description") ? req.studio.description : undefined,
    danceStyles: studioConfirmed("danceStyles") ? req.studio.danceStyles : undefined,
    classTypes: studioConfirmed("classTypes") ? req.studio.classTypes : undefined,
    certifications: instructor?.confirmed === true ? instructor.certifications : undefined,
  };
  const { drafts, failed } = await draftNarratives(narrativeFacts, needDraft, call);
  if (failed) warnings.push("We couldn't generate draft text right now; write those answers yourself or try again.");
  for (const q of needDraft) {
    const text = drafts.get(q.id);
    if (text) out.set(q.id, { questionId: q.id, answer: text, provenance: "ai_draft", needsInput: false });
    else if (!failed) warnings.push(`Not enough confirmed information to draft "${q.label}".`);
  }

  const answers = form.questions.map((q) => out.get(q.id)!);
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  return {
    providerId: form.providerId,
    title: form.title,
    applicantType: form.applicantType,
    submissionMethod: form.submissionMethod,
    formVersion: form.version,
    isDemo: form.isDemo,
    notice: form.notice ?? null,
    portalUrl: form.portalUrl,
    portalUrlVerified: form.portalUrlVerified,
    formUrl: form.formUrl ?? null,
    prefillUrl: buildPrefillUrl(form, answers),
    instructorId: instructor?.id ?? null,
    answers,
    missingQuestionIds: form.questions.filter((q) => q.required && !q.sensitive && !q.declaration && byId.get(q.id)!.answer.trim() === "").map((q) => q.id),
    aiDraftedQuestionIds: answers.filter((a) => a.provenance === "ai_draft" && a.answer.trim() !== "").map((a) => a.questionId),
    ownerOnlyQuestionIds: form.questions.filter((q) => q.sensitive || q.declaration).map((q) => q.id),
    warnings: [...new Set(warnings)],
  };
}

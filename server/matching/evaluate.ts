import providersJson from "../../data/providers.json" with { type: "json" };
import { evaluateRequirement } from "./rules.js";
import { Catalog, type CatalogProvider, type FitLabel, type InstructorQuestion, type MatchEntry, type MatchInstructor, type MatchRequest } from "./types.js";

export const catalog: CatalogProvider[] = Catalog.parse(providersJson).providers;

const fallbackText = (e: Omit<MatchEntry, "explanation" | "explanationSource">): string => {
  const need = e.missingToApply.length ? ` Still needed: ${e.missingToApply.join(", ")}.` : "";
  if (e.workflowMode === "external_link") return `${e.fitLabel}: ${e.providerName} looks relevant, but we can't confirm eligibility or acceptance. Apply on their site.${need}`;
  if (e.fitLabel === "Known requirement not met") return `Known requirement not met: ${e.blockers.join(", ")}. Only ${e.providerName} can decide eligibility.${need}`;
  if (e.fitLabel === "More information needed") return `More information needed before preparing this application.${need} Unknown items are not counted as failed.`;
  return e.missingBeforeTeaching.length
    ? `Potential fit: nothing we know blocks starting this application. Before teaching you will also need: ${e.missingBeforeTeaching.join(", ")}.`
    : "Potential fit: nothing we know blocks starting this application.";
};

const LABELS: Record<MatchEntry["readiness"], FitLabel> = { ready: "Potential fit", missing_items: "More information needed", not_a_fit: "Known requirement not met" };

/** Pure, deterministic evaluation of one provider for the studio (and one instructor, if instructor-specific). */
export function evaluateProvider(p: CatalogProvider, studio: MatchRequest["studio"], instructor: MatchInstructor | null, studioConfirmed = false): MatchEntry {
  // Instructors are evaluated in isolation: facts contain ONLY this instructor.
  const facts = { studio: studio as Record<string, unknown>, instructor: (instructor ?? {}) as Record<string, unknown>, studioConfirmed };
  const results = p.requirements.map((r) => ({ req: r, res: evaluateRequirement(r, facts) })).filter((x) => x.res !== null) as { req: (typeof p.requirements)[number]; res: NonNullable<ReturnType<typeof evaluateRequirement>> }[];

  const apply = results.filter((x) => x.req.stage === "application");
  const later = results.filter((x) => x.req.stage !== "application");
  const notMet = apply.filter((x) => x.res.result === "not_met");
  const open = apply.filter((x) => x.res.result !== "met");

  // The instructor-specific program can't be judged from studio details alone.
  const instructorRequired = p.applicantType === "instructor" && instructor === null;
  // Only application-stage requirements decide readiness. Onboarding/teaching never block.
  const readiness = notMet.some((x) => x.req.hardBlocker) ? "not_a_fit" : open.length || instructorRequired ? "missing_items" : "ready";
  // Known failures (not_met) outrank unknowns in the label, whether or not they are hard blockers.
  const fitLabel: FitLabel = notMet.length ? "Known requirement not met" : LABELS[readiness];

  // Ask about the instructor's own facts, not the studio's.
  const instructorQuestions: InstructorQuestion[] = [];
  if (p.applicantType === "instructor") {
    for (const x of open) {
      const cond = [...(x.req.rule.all ?? []), ...(x.req.rule.any ?? [])].find((c) => c.field.startsWith("instructor."));
      if (cond) instructorQuestions.push({ requirementId: x.req.id, label: x.req.missingLabel, answerKey: cond.field.slice("instructor.".length), type: "yes_no" });
    }
  }

  const base = {
    providerId: p.id,
    providerName: p.name,
    instructorId: instructor?.id ?? null,
    workflowMode: p.workflowMode,
    readiness,
    fitLabel,
    eligibilityConfirmed: false as const,
    instructorRequired,
    instructorQuestions,
    linkEvidence: p.linkEvidence,
    missingToApply: [...(instructorRequired ? ["Select or add the instructor who would teach"] : []), ...open.map((x) => x.req.missingLabel)],
    missingBeforeTeaching: later.filter((x) => x.res.result !== "met").map((x) => x.req.missingLabel),
    blockers: notMet.map((x) => x.req.missingLabel),
    requirementResults: results.map((x) => x.res),
    sources: p.sourceUrls,
    externalUrl: p.workflowMode === "external_link" ? p.applicationUrl : null,
    applicationUrl: p.applicationUrl,
    applicationUrlVerified: p.applicationUrlVerified,
    requirementsVerified: p.requirementsVerified,
    lastChecked: p.lastChecked,
  } satisfies Omit<MatchEntry, "explanation" | "explanationSource">;
  return { ...base, explanation: fallbackText(base), explanationSource: "deterministic_fallback" };
}

export function evaluateAll(req: MatchRequest): MatchEntry[] {
  const out: MatchEntry[] = [];
  for (const p of catalog) {
    if (p.applicantType === "instructor") {
      const list: (MatchInstructor | null)[] = req.instructors.length ? req.instructors : [null];
      for (const i of list) out.push(evaluateProvider(p, req.studio, i, req.studioConfirmed === true));
    } else out.push(evaluateProvider(p, req.studio, null, req.studioConfirmed === true));
  }
  return out;
}

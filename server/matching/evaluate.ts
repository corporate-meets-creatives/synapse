import providersJson from "../../data/providers.json" with { type: "json" };
import { evaluateRequirement } from "./rules.js";
import { Catalog, type CatalogProvider, type MatchEntry, type MatchInstructor, type MatchRequest } from "./types.js";

export const catalog: CatalogProvider[] = Catalog.parse(providersJson).providers;

const fallbackText = (e: Omit<MatchEntry, "explanation" | "explanationSource">): string => {
  if (e.workflowMode === "external_link") {
    return e.missingToApply.length
      ? `This is a possible match. We can't confirm eligibility or acceptance; apply on ${e.providerName}'s site. Information to gather first: ${e.missingToApply.join(", ")}.`
      : `This is a possible match. We can't confirm eligibility or acceptance; apply on ${e.providerName}'s site.`;
  }
  if (e.readiness === "not_a_fit") return `A requirement to apply is not met: ${e.blockers.join(", ")}.`;
  if (e.missingToApply.length) return `To start the application we still need: ${e.missingToApply.join(", ")}. Items marked unknown are not counted as failed.`;
  return e.missingBeforeTeaching.length
    ? `You can start this application. Before teaching you will also need: ${e.missingBeforeTeaching.join(", ")}.`
    : "You can start this application.";
};

/** Pure, deterministic evaluation of one provider for the studio (and one instructor, if instructor-specific). */
export function evaluateProvider(p: CatalogProvider, studio: MatchRequest["studio"], instructor: MatchInstructor | null): MatchEntry {
  // Instructors are evaluated in isolation: facts contain ONLY this instructor.
  const facts = { studio: studio as Record<string, unknown>, instructor: (instructor ?? {}) as Record<string, unknown> };
  const results = p.requirements.map((r) => ({ req: r, res: evaluateRequirement(r, facts) })).filter((x) => x.res !== null) as { req: (typeof p.requirements)[number]; res: NonNullable<ReturnType<typeof evaluateRequirement>> }[];

  const apply = results.filter((x) => x.req.stage === "application");
  const later = results.filter((x) => x.req.stage !== "application");
  const notMet = apply.filter((x) => x.res.result === "not_met");
  const open = apply.filter((x) => x.res.result !== "met");

  // Only application-stage requirements decide readiness. Onboarding/teaching never block.
  const readiness = notMet.some((x) => x.req.hardBlocker) ? "not_a_fit" : open.length ? "missing_items" : "ready";

  const base = {
    providerId: p.id,
    providerName: p.name,
    instructorId: instructor?.id ?? null,
    workflowMode: p.workflowMode,
    readiness,
    missingToApply: open.map((x) => x.req.missingLabel),
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
      for (const i of list) out.push(evaluateProvider(p, req.studio, i));
    } else out.push(evaluateProvider(p, req.studio, null));
  }
  return out;
}

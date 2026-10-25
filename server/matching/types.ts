import { z } from "zod";
import { StudioProfileInput } from "../../shared/schemas.js";

// ---------- catalog (data/providers.json) ----------
const Condition = z.object({ field: z.string(), op: z.enum(["is_true", "is_false", "nonempty", "equals", "gte"]), value: z.union([z.string(), z.number()]).optional() });
export type Condition = z.infer<typeof Condition>;

const Source = z.object({ url: z.url(), passage: z.string().optional() });
export type Source = z.infer<typeof Source>;

/** A question that resolves an unknown requirement. `field` is the profile path the answer is written to. */
const Ask = z.object({ field: z.string(), question: z.string(), type: z.enum(["yes_no", "text", "list"]), why: z.string() });
export type Ask = z.infer<typeof Ask>;

const CatalogRequirement = z
  .object({
    id: z.string(), // stable
    label: z.string(),
    missingLabel: z.string(),
    stage: z.enum(["application", "onboarding", "teaching"]),
    hardBlocker: z.boolean().default(false),
    appliesWhen: Condition.optional(),
    // all: every condition must hold; any: at least one. Exactly one of the two is used.
    rule: z.object({ all: z.array(Condition).optional(), any: z.array(Condition).optional() }).refine((r) => Boolean(r.all?.length) !== Boolean(r.any?.length)),
    source: Source.optional(),
    asks: z.array(Ask).default([]),
  });
export type CatalogRequirement = z.infer<typeof CatalogRequirement>;

export const CatalogProvider = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  applicantType: z.enum(["studio", "instructor"]),
  workflowMode: z.enum(["prepare_application", "external_link"]),
  applicationUrl: z.url(),
  applicationUrlVerified: z.boolean(),
  linkEvidence: z.object({ status: z.enum(["team_provided", "reachable", "unverified"]), note: z.string(), checkedAt: z.string() }),
  sourceUrls: z.array(z.url()),
  lastChecked: z.string(),
  requirementsVerified: z.boolean(),
  requirements: z.array(CatalogRequirement),
});
export type CatalogProvider = z.infer<typeof CatalogProvider>;
export const Catalog = z.object({ providers: z.array(CatalogProvider) });

// ---------- request ----------
export const MatchInstructor = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(200).default(""),
  confirmed: z.boolean().optional(), // owner confirmed this instructor's details
  cprCertified: z.boolean().optional(),
  certifications: z.array(z.string().max(200)).max(20).default([]),
  /** Owner-reported answers keyed by requirement input (adultAttested, hasLiabilityInsurance, ...). Missing = unknown. */
  requirementAnswers: z.record(z.string(), z.union([z.boolean(), z.string(), z.number(), z.null()])).default({}),
});
export type MatchInstructor = z.infer<typeof MatchInstructor>;

export const MatchRequest = z.object({
  studioConfirmed: z.boolean().optional(), // owner confirmed the whole studio profile
  studio: StudioProfileInput.partial().extend({
    classTypes: z.array(z.string()).optional(),
    googleBusinessProfileVerified: z.boolean().optional(),
    hasPriceList: z.boolean().optional(),
  }),
  instructors: z.array(MatchInstructor).max(50).default([]),
});
export type MatchRequest = z.infer<typeof MatchRequest>;

// ---------- response (superset of shared MatchResult) ----------
export type Result = "met" | "not_met" | "unknown";
/** Where a met requirement's evidence came from. "extracted" = read from a website/AI, not yet confirmed by the owner. */
export type Basis = "extracted" | "owner_reported" | "owner_confirmed";
export interface RequirementResult {
  requirementId: string;
  label: string;
  stage: "application" | "onboarding" | "teaching";
  result: Result;
  basis?: Basis; // only for "met"
  source?: Source;
}
export type FitLabel = "Potential fit" | "More information needed" | "Known requirement not met";
export interface InstructorQuestion {
  requirementId: string;
  label: string; // what we need to know
  answerKey: string; // field on the instructor to fill, e.g. "cprCertified" or "requirementAnswers.adultAttested"
  type: "yes_no";
}
export interface MatchEntry {
  fitLabel: FitLabel;
  /** Always false: only the provider decides eligibility; nothing here confirms it. */
  eligibilityConfirmed: false;
  /** FLEX is instructor-specific: true when no instructor was given, so studio details alone are not enough. */
  instructorRequired: boolean;
  /** What to ask the owner about this instructor (FLEX only). */
  instructorQuestions: InstructorQuestion[];
  linkEvidence: { status: "team_provided" | "reachable" | "unverified"; note: string; checkedAt: string };
  providerId: string;
  providerName: string;
  instructorId: string | null;
  workflowMode: "prepare_application" | "external_link";
  readiness: "ready" | "missing_items" | "not_a_fit";
  missingToApply: string[]; // application-stage items not met or unknown
  missingBeforeTeaching: string[]; // onboarding/teaching items not yet met
  blockers: string[]; // application-stage items known to be not_met
  requirementResults: RequirementResult[];
  sources: string[];
  externalUrl: string | null; // external_link providers only
  applicationUrl: string;
  applicationUrlVerified: boolean;
  requirementsVerified: boolean;
  lastChecked: string;
  explanation: string;
  explanationSource: "ai" | "deterministic_fallback";
}
export interface MatchResponse {
  matches: MatchEntry[];
}

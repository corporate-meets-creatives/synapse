import { z } from "zod";
import { StudioProfileInput } from "../../shared/schemas.js";

export const Question = z.object({
  id: z.string(), // stable
  label: z.string(),
  type: z.enum(["short_text", "long_text", "email", "phone", "url", "number", "date", "single_choice", "multi_choice"]),
  options: z.array(z.string()).optional(),
  required: z.boolean(),
  helpText: z.string().optional(),
  profileField: z.string().optional(), // e.g. "studio.name", "instructor.cprCertified"
  draftable: z.boolean().default(false), // Claude may write narrative
  sensitive: z.boolean().default(false), // tax / banking: never filled
  declaration: z.boolean().default(false), // terms / certification: owner only
  googleEntryId: z.string().optional(), // Google Forms prefill key (entry.123)
  hubspotField: z.string().optional(), // HubSpot internal field name
  section: z.string().optional(),
  validation: z.object({ maxLength: z.number().int().optional() }).default({}),
});
export type Question = z.infer<typeof Question>;

export const FormDef = z.object({
  providerId: z.string(),
  title: z.string().default(""),
  version: z.string(),
  isDemo: z.boolean(),
  applicantType: z.enum(["studio", "instructor"]).default("instructor"),
  submissionMethod: z.enum(["google_form_prefill", "copy_assist"]).default("copy_assist"),
  formUrl: z.url().optional(),
  notice: z.string().optional(),
  portalUrl: z.url().nullable(),
  portalUrlVerified: z.boolean(),
  verifiedSource: z.object({ url: z.url().optional(), verifiedBy: z.string().optional(), verifiedAt: z.string().optional() }).nullable(),
  capturedAt: z.string(),
  /** Question ids the live form had when we mapped it; a different set means the form changed. */
  structureSnapshot: z.object({ entryIds: z.array(z.string()).optional(), fieldNames: z.array(z.string()).optional(), capturedAt: z.string() }).optional(),
  /** Browser assistant (agent/autofill): which adapter fills this form, and the only site it may act on. */
  assistant: z.object({ adapter: z.enum(["hubspot"]), site: z.object({ origin: z.url(), pathPrefix: z.string() }) }).optional(),
  questions: z.array(Question).min(1),
});
export type FormDef = z.infer<typeof FormDef>;

export const Provenance = z.enum(["owner_confirmed", "ai_draft", "owner_edited"]);
export type Provenance = z.infer<typeof Provenance>;

export const AnswerField = z.object({
  questionId: z.string(),
  answer: z.string().max(10000),
  provenance: Provenance,
  needsInput: z.boolean().default(false),
});
export type AnswerField = z.infer<typeof AnswerField>;

export const DraftInstructor = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(200).default(""),
  confirmed: z.boolean().optional(), // owner confirmed this instructor record
  cprCertified: z.boolean().optional(),
  certifications: z.array(z.string().max(200)).max(20).default([]),
  requirementAnswers: z.record(z.string(), z.union([z.boolean(), z.string(), z.number(), z.null()])).default({}),
});
export type DraftInstructor = z.infer<typeof DraftInstructor>;

export const DraftRequest = z.object({
  providerId: z.string().default("silversneakers"),
  formVersion: z.string().optional(), // defaults to the current version
  studio: StudioProfileInput.partial().extend({ classTypes: z.array(z.string()).optional() }),
  studioConfirmed: z.boolean().optional(), // owner confirmed the whole studio profile
  instructor: DraftInstructor.optional(), // exactly one instructor per request (required for instructor-level forms)
  existingAnswers: z.array(AnswerField).max(100).default([]),
  regenerateQuestionIds: z.array(z.string()).max(100).default([]),
  /** Check that the live form still matches our mapping before offering a pre-filled link (reads the public form). */
  verifyForm: z.boolean().optional(),
});
export type DraftRequest = z.infer<typeof DraftRequest>;

export interface DraftResponse {
  providerId: string;
  formVersion: string;
  isDemo: boolean;
  notice: string | null;
  portalUrl: string | null;
  portalUrlVerified: boolean;
  title: string;
  applicantType: "studio" | "instructor";
  submissionMethod: "google_form_prefill" | "copy_assist";
  formUrl: string | null;
  prefillUrl: string | null; // Google Forms only: opens the form with answers pre-filled; the owner submits
  prefill: import("./prefill.js").PrefillResult | null; // link status plus what was filled, skipped or couldn't be used
  instructorId: string | null;
  answers: AnswerField[]; // one per question, in form order
  missingQuestionIds: string[]; // required, still blank
  aiDraftedQuestionIds: string[]; // generated narrative needing owner review
  ownerOnlyQuestionIds: string[]; // tax/banking/declarations: complete in the provider portal
  warnings: string[];
}

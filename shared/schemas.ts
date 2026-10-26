import { z } from "zod";

// ---------- Common ----------
export const Provenance = z.enum(["owner_confirmed", "ai_draft", "owner_edited"]);
export type Provenance = z.infer<typeof Provenance>;

export const FieldMeta = z.object({
  source: z.url().optional(), // page the value was extracted from
  provenance: Provenance,
});

// Every endpoint returns errors in this one shape. fieldErrors maps a field path ("profile.name") to messages.
// /api/extract may add `fallback`: what the UI should offer next ("paste_text", "manual_entry").
export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(), // safe to show to the owner
    fieldErrors: z.record(z.string(), z.array(z.string())).default({}),
    fallback: z.array(z.enum(["paste_text", "manual_entry"])).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

// ---------- Studio + instructors ----------
export const InstructorInput = z.object({
  id: z.uuid().optional(), // omit for new instructors
  name: z.string().min(1).max(200),
  cprCertified: z.boolean().optional(),
  certifications: z.array(z.string().max(200)).max(20).default([]),
  // Owner-reported yes/no answers the matcher reads (adultAttested, hasLiabilityInsurance, ...). Missing = unknown.
  requirementAnswers: z.record(z.string(), z.boolean()).default({}),
});
export type InstructorInput = z.infer<typeof InstructorInput>;

export const StudioProfileInput = z.object({
  name: z.string().min(1).max(200),
  website: z.url().optional(),
  address: z.string().max(300).optional(),
  zip: z.string().max(20).optional(),
  city: z.string().max(100),
  state: z.string().max(50),
  phone: z.string().max(50).optional(),
  email: z.email().optional(),
  contactName: z.string().max(200).optional(),
  danceStyles: z.array(z.string().max(100)).max(30).default([]),
  classTypes: z.array(z.string().max(100)).max(20).default([]),
  schedulingPlatform: z.string().max(100).optional(),
  hasLiabilityInsurance: z.boolean().optional(),
  googleBusinessProfileVerified: z.boolean().optional(),
  hasPriceList: z.boolean().optional(),
  legalStructure: z.string().max(100).optional(),
  yearsOperating: z.number().int().min(0).max(200).optional(),
  employeeCount: z.number().int().min(0).max(100000).optional(),
  description: z.string().max(2000).optional(),
  fieldMeta: z.record(z.string(), FieldMeta).default({}),
});
export type StudioProfileInput = z.infer<typeof StudioProfileInput>;

export const Instructor = InstructorInput.extend({ id: z.uuid() });
export type Instructor = z.infer<typeof Instructor>;

export const Studio = z.object({
  id: z.uuid(),
  profile: StudioProfileInput,
  instructors: z.array(Instructor),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Studio = z.infer<typeof Studio>;

// POST /api/profiles  -> CreateStudioResponse (token returned ONCE)
// GET/PUT /api/profiles (header x-access-token) -> { studio }
export const SaveStudioRequest = z.object({
  profile: StudioProfileInput,
  instructors: z.array(InstructorInput).max(50).default([]),
});
export type SaveStudioRequest = z.infer<typeof SaveStudioRequest>;
export const CreateStudioResponse = z.object({ token: z.string(), studio: Studio });
export type CreateStudioResponse = z.infer<typeof CreateStudioResponse>;

// ---------- Extraction ----------
// POST /api/extract { url } -> ExtractResponse
export const ExtractRequest = z.object({ url: z.url() });
export const ExtractResponse = z.object({
  profile: StudioProfileInput.partial(),
  missingFields: z.array(z.string()),
  pagesRead: z.array(z.url()),
});
export type ExtractResponse = z.infer<typeof ExtractResponse>;

// ---------- Providers + forms ----------
export const RequirementStage = z.enum(["needed_to_apply", "needed_before_teaching"]);
export const Requirement = z.object({
  id: z.string(),
  label: z.string(),
  stage: RequirementStage,
  profileField: z.string().optional(), // e.g. "hasLiabilityInsurance"
  sensitive: z.boolean().default(false), // tax/bank: never stored, entered on provider site
});
export type Requirement = z.infer<typeof Requirement>;

export const Provider = z.object({
  id: z.string(), // "silversneakers" | "forma" | "wellhub"
  name: z.string(),
  summary: z.string(),
  applicationUrl: z.url(),
  submissionMethod: z.enum(["google_form_prefill", "copy_assist"]),
  sourceUrl: z.url(),
  lastChecked: z.string(), // ISO date
  requirements: z.array(Requirement),
});
export type Provider = z.infer<typeof Provider>;

export const FormQuestion = z.object({
  id: z.string(),
  label: z.string(), // exact question text from the provider form
  type: z.enum(["short_text", "long_text", "email", "phone", "url", "number", "date", "single_choice", "multi_choice"]),
  options: z.array(z.string()).optional(),
  required: z.boolean(),
  profileField: z.string().optional(), // fill from confirmed profile
  draftable: z.boolean().default(false), // Claude may draft (narrative only)
  sensitive: z.boolean().default(false),
  googleEntryId: z.string().optional(), // "entry.123456" for Forma prefill
});
export type FormQuestion = z.infer<typeof FormQuestion>;

export const FormSchema = z.object({
  providerId: z.string(),
  formUrl: z.url(),
  version: z.string(),
  capturedAt: z.string(),
  questions: z.array(FormQuestion),
});
export type FormSchema = z.infer<typeof FormSchema>;

// ---------- Matching ----------
// POST /api/match (header x-access-token) -> { matches: MatchResult[] }
export const MatchResult = z.object({
  providerId: z.string(),
  readiness: z.enum(["ready", "missing_items", "not_a_fit"]),
  missingToApply: z.array(z.string()),
  missingBeforeTeaching: z.array(z.string()),
  explanation: z.string().optional(), // Claude; absent if Claude failed
});
export type MatchResult = z.infer<typeof MatchResult>;

// ---------- Applications ----------
export const ApplicationStatus = z.enum(["draft", "approved_for_copying", "submitted_owner_reported"]);
export type ApplicationStatus = z.infer<typeof ApplicationStatus>;

export const ApplicationField = z.object({
  questionId: z.string(),
  answer: z.string(),
  provenance: Provenance,
  needsInput: z.boolean().default(false), // required but unknown
});
export type ApplicationField = z.infer<typeof ApplicationField>;

export const Application = z.object({
  id: z.uuid(),
  studioId: z.uuid(),
  providerId: z.string(),
  instructorId: z.uuid().nullable().default(null),
  formVersion: z.string(), // which version of the provider form these answers are for
  fields: z.array(ApplicationField),
  status: ApplicationStatus,
  version: z.number().int(), // increases on every saved edit
  approvedVersion: z.number().int().nullable().default(null), // the exact version the owner approved
  prefillUrl: z.url().nullable().default(null), // Forma only
  approvedAt: z.string().nullable().default(null),
  submittedAt: z.string().nullable().default(null), // owner-reported
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Application = z.infer<typeof Application>;

// POST /api/applications (header x-access-token) -> { application }
export const CreateApplicationRequest = z.object({
  providerId: z.string().min(1).max(100),
  instructorId: z.uuid().nullable().default(null),
  formVersion: z.string().min(1).max(100),
  fields: z.array(ApplicationField).max(200).default([]),
});
export type CreateApplicationRequest = z.infer<typeof CreateApplicationRequest>;

// PATCH /api/applications?id=... (header x-access-token) -> { application }
export const UpdateApplicationRequest = z.discriminatedUnion("action", [
  // Saves answers. Clears any approval. Send the version you loaded to avoid overwriting newer edits.
  z.object({ action: z.literal("edit"), expectedVersion: z.number().int(), fields: z.array(ApplicationField).max(200) }),
  // Approves exactly this saved version for copying.
  z.object({ action: z.literal("approve"), version: z.number().int() }),
  // Owner says they submitted on the provider's site. Date defaults to now.
  z.object({ action: z.literal("mark_submitted"), submittedAt: z.iso.date().optional() }),
]);
export type UpdateApplicationRequest = z.infer<typeof UpdateApplicationRequest>;

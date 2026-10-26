import type {
  Application, ApplicationField, ExtractResponse, Studio, StudioProfileInput, InstructorInput,
} from "../../shared/schemas";

export type ApiFailure = { code: string; message: string; fieldErrors: Record<string, string[]>; fallback?: string[] };
export class ApiError extends Error {
  code: string;
  status: number;
  fieldErrors: Record<string, string[]>;
  fallback: string[]; // what to offer instead, e.g. ["paste_text", "manual_entry"]
  constructor(status: number, f: ApiFailure) {
    super(f.message);
    this.status = status;
    this.code = f.code;
    this.fieldErrors = f.fieldErrors ?? {};
    this.fallback = f.fallback ?? [];
  }
}

async function call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init.token) headers["x-access-token"] = init.token; // private link travels in a header, never in the API URL
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers });
  } catch {
    throw new ApiError(0, { code: "network", message: "We couldn't reach Wellyfish. Check your connection and try again.", fieldErrors: {} });
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = (body as { error?: ApiFailure | string }).error;
    const f: ApiFailure = typeof e === "object" && e
      ? e
      : { code: typeof e === "string" ? e : "error", message: "Something went wrong. Please try again.", fieldErrors: {} };
    throw new ApiError(res.status, f);
  }
  return body as T;
}

// ---- matching (shape returned by /api/match) ----
export type RequirementResult = {
  requirementId: string; label: string; stage: "application" | "onboarding" | "teaching";
  result: "met" | "not_met" | "unknown"; source?: { url: string; passage?: string };
  basis?: "extracted" | "owner_reported" | "owner_confirmed"; // where the evidence for a met requirement came from
};
export type MatchEntry = {
  providerId: string; providerName: string; instructorId: string | null;
  workflowMode: "prepare_application" | "external_link";
  readiness: "ready" | "missing_items" | "not_a_fit";
  missingToApply: string[]; missingBeforeTeaching: string[]; blockers: string[];
  requirementResults: RequirementResult[]; sources: string[];
  externalUrl: string | null; applicationUrl: string; applicationUrlVerified: boolean;
  requirementsVerified: boolean; lastChecked: string; explanation: string;
  explanationSource: "ai" | "deterministic_fallback";
  instructorRequired?: boolean; // FLEX without a chosen instructor: studio details alone are not enough
  fitLabel?: "Potential fit" | "More information needed" | "Known requirement not met";
  eligibilityConfirmed?: false; // only the provider decides eligibility
  linkEvidence?: { status: "team_provided" | "reachable" | "unverified"; note: string; checkedAt: string };
};

// ---- follow-up questions (shape returned by /api/questions) ----
export type FollowUpQuestion = {
  id: string; field: string; label: string; type: "yes_no" | "text" | "list" | "choice" | "number";
  options?: string[]; why: string; source: "requirement" | "form";
};
export type ConfirmedItem = {
  id: string; field: string; label: string; value: unknown; basis: "extracted" | "owner_reported" | "owner_confirmed";
  result?: "met" | "not_met" | "unknown"; editable: true; needsConfirmation?: boolean;
};
export type QuestionsInstructor = {
  id: string; name: string; cprCertified?: boolean; certifications: string[]; requirementAnswers: Record<string, boolean | string | number | null>;
};
export type QuestionsResponse = {
  providerId: string; providerName: string; form: { version: string; isDemo: boolean } | null;
  instructorSelection: { required: boolean; selectedId: string | null; options: { id: string; name: string }[]; canAdd: boolean };
  instructors: QuestionsInstructor[];
  studio: StudioProfileInput;
  questions: FollowUpQuestion[]; confirmed: ConfirmedItem[]; unknownFields: string[];
  readiness: { fitLabel: "Potential fit" | "More information needed" | "Known requirement not met"; readiness: MatchEntry["readiness"]; missingToApply: string[]; blockers: string[]; eligibilityConfirmed: false } | null;
  existingAnswers: { questionId: string; answer: string; provenance: "owner_edited"; needsInput: false }[];
  done: boolean;
};
export type AnswerIn = { field: string; value: string | boolean | number | string[] | null };


// ---- provider application forms + drafting (shape returned by /api/draft) ----
export type FormQuestion = {
  id: string; label: string; type: "short_text" | "long_text" | "email" | "phone" | "url" | "number" | "date" | "single_choice" | "multi_choice";
  options?: string[]; required: boolean; helpText?: string; draftable?: boolean; sensitive?: boolean; declaration?: boolean; section?: string;
  hubspotField?: string; googleEntryId?: string; // where the browser assistant / prefill link puts this answer
};
export type FormDef = {
  providerId: string; title: string; version: string; isDemo: boolean; notice?: string; portalUrl: string | null;
  applicantType: "studio" | "instructor"; questions: FormQuestion[];
  submissionMethod?: "google_form_prefill" | "copy_assist"; formUrl?: string;
  structureSnapshot?: { entryIds?: string[]; fieldNames?: string[]; capturedAt: string };
  assistant?: { adapter: "hubspot"; site: { origin: string; pathPrefix: string } }; // the one site the browser assistant may fill
};
export type PrefillResult = {
  url: string | null; status: "ok" | "unverified" | "form_changed" | "not_supported"; message: string | null; checkedAt: string | null;
  filled: { questionId: string; label: string }[];
  skipped: { questionId: string; label: string; reason: "blank" | "unreviewed_ai_draft" | "portal_only" | "no_prefill_field" }[];
  failed: { questionId: string; label: string; reason: "not_an_option" }[];
};
export type DraftResponse = {
  providerId: string; formVersion: string; isDemo: boolean; notice: string | null; portalUrl: string | null;
  answers: ApplicationField[]; missingQuestionIds: string[]; aiDraftedQuestionIds: string[]; ownerOnlyQuestionIds: string[]; warnings: string[];
  prefillUrl?: string | null; prefill?: PrefillResult | null; // Google Forms: link status plus what was filled, skipped or couldn't be used
};

export const api = {
  extract: (input: { url: string } | { text: string }) =>
    call<ExtractResponse>("/api/extract", { method: "POST", body: JSON.stringify(input) }),

  createStudio: (profile: StudioProfileInput, instructors: InstructorInput[]) =>
    call<{ token: string; studio: Studio }>("/api/profiles", { method: "POST", body: JSON.stringify({ profile, instructors }) }),
  getStudio: (token: string) => call<{ studio: Studio }>("/api/profiles", { token }),
  updateStudio: (token: string, profile: StudioProfileInput, instructors: InstructorInput[]) =>
    call<{ studio: Studio }>("/api/profiles", { method: "PUT", token, body: JSON.stringify({ profile, instructors }) }),

  match: (studio: Studio) =>
    call<{ matches: MatchEntry[] }>("/api/match", {
      method: "POST",
      body: JSON.stringify({
        studio: studio.profile,
        instructors: studio.instructors.map((i) => ({
          id: i.id, name: i.name, cprCertified: i.cprCertified,
          certifications: i.certifications, requirementAnswers: i.requirementAnswers ?? {},
        })),
      }),
    }),

  questions: (studio: Studio, body: { providerId: string; instructorId?: string; answers: AnswerIn[]; existingAnswers?: { questionId: string; answer: string }[] }) =>
    call<QuestionsResponse>("/api/questions", {
      method: "POST",
      body: JSON.stringify({
        ...body,
        studio: studio.profile,
        instructors: studio.instructors.map((i) => ({
          id: i.id, name: i.name, cprCertified: i.cprCertified,
          certifications: i.certifications, requirementAnswers: i.requirementAnswers ?? {},
        })),
      }),
    }),

  form: (providerId: string) => call<FormDef>(`/api/draft?providerId=${encodeURIComponent(providerId)}`),
  draft: (studio: Studio, providerId: string, instructorId: string | null, existingAnswers: ApplicationField[] = [], regenerateQuestionIds: string[] = [], verifyForm = false) => {
    const i = instructorId ? studio.instructors.find((x) => x.id === instructorId) : undefined;
    return call<DraftResponse>("/api/draft", {
      method: "POST",
      body: JSON.stringify({
        providerId, studio: studio.profile, studioConfirmed: true, existingAnswers, regenerateQuestionIds, verifyForm,
        instructor: i ? { id: i.id, name: i.name, confirmed: true, cprCertified: i.cprCertified, certifications: i.certifications, requirementAnswers: i.requirementAnswers ?? {} } : undefined,
      }),
    });
  },

  listApplications: (token: string) => call<{ applications: Application[] }>("/api/applications", { token }),
  getApplication: (token: string, id: string) =>
    call<{ application: Application }>(`/api/applications?id=${encodeURIComponent(id)}`, { token }),
  createApplication: (token: string, body: { providerId: string; instructorId: string | null; formVersion: string; fields: ApplicationField[] }) =>
    call<{ application: Application }>("/api/applications", { method: "POST", token, body: JSON.stringify(body) }),
  editApplication: (token: string, id: string, expectedVersion: number, fields: ApplicationField[]) =>
    call<{ application: Application }>(`/api/applications?id=${encodeURIComponent(id)}`, {
      method: "PATCH", token, body: JSON.stringify({ action: "edit", expectedVersion, fields }),
    }),
  approveApplication: (token: string, id: string, version: number) =>
    call<{ application: Application }>(`/api/applications?id=${encodeURIComponent(id)}`, {
      method: "PATCH", token, body: JSON.stringify({ action: "approve", version }),
    }),
  markSubmitted: (token: string, id: string, submittedAt?: string) =>
    call<{ application: Application }>(`/api/applications?id=${encodeURIComponent(id)}`, {
      method: "PATCH", token, body: JSON.stringify({ action: "mark_submitted", submittedAt }),
    }),
};

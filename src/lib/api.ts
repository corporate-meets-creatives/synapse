import type {
  Application, ApplicationField, ExtractResponse, Studio, StudioProfileInput, InstructorInput,
} from "../../shared/schemas";

export type ApiFailure = { code: string; message: string; fieldErrors: Record<string, string[]> };
export class ApiError extends Error {
  code: string;
  status: number;
  fieldErrors: Record<string, string[]>;
  constructor(status: number, f: ApiFailure) {
    super(f.message);
    this.status = status;
    this.code = f.code;
    this.fieldErrors = f.fieldErrors ?? {};
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
};

export const api = {
  extract: (url: string) =>
    call<ExtractResponse>("/api/extract", { method: "POST", body: JSON.stringify({ url }) }),

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

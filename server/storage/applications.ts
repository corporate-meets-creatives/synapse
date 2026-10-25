import { db } from "./supabase.js";
import type { Application, ApplicationField, CreateApplicationRequest } from "../../shared/schemas.js";

// Errors the API turns into friendly responses
export class AppError extends Error {
  constructor(public status: number, public code: string, message: string, public fieldErrors: Record<string, string[]> = {}) {
    super(message);
  }
}

const COLUMNS =
  "id, studio_id, instructor_id, provider_id, form_version, fields, status, version, approved_version, approved_at, submitted_at, prefill_url, created_at, updated_at";

type Row = {
  id: string; studio_id: string; instructor_id: string | null; provider_id: string; form_version: string;
  fields: ApplicationField[]; status: Application["status"]; version: number; approved_version: number | null;
  approved_at: string | null; submitted_at: string | null; prefill_url: string | null; created_at: string; updated_at: string;
};

const toApplication = (r: Row): Application => ({
  id: r.id,
  studioId: r.studio_id,
  instructorId: r.instructor_id,
  providerId: r.provider_id,
  formVersion: r.form_version,
  fields: r.fields,
  status: r.status,
  version: r.version,
  approvedVersion: r.approved_version,
  prefillUrl: r.prefill_url,
  approvedAt: r.approved_at,
  submittedAt: r.submitted_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// Every read is scoped to the studio that owns the private link.
async function getRow(studioId: string, id: string): Promise<Row> {
  const { data } = await db.from("applications").select(COLUMNS).eq("id", id).eq("studio_id", studioId).maybeSingle();
  if (!data) throw new AppError(404, "not_found", "Application not found.");
  return data as Row;
}

export async function listApplications(studioId: string) {
  const { data } = await db.from("applications").select(COLUMNS).eq("studio_id", studioId).order("updated_at", { ascending: false });
  return ((data ?? []) as Row[]).map(toApplication);
}

export async function getApplication(studioId: string, id: string) {
  return toApplication(await getRow(studioId, id));
}

export async function createApplication(studioId: string, input: CreateApplicationRequest) {
  if (input.instructorId) {
    const { data } = await db.from("instructors").select("id").eq("id", input.instructorId).eq("studio_id", studioId).maybeSingle();
    if (!data) throw new AppError(400, "invalid_instructor", "That instructor doesn't belong to this studio.");
  }
  const { data, error } = await db
    .from("applications")
    .insert({
      studio_id: studioId,
      instructor_id: input.instructorId,
      provider_id: input.providerId,
      form_version: input.formVersion,
      fields: input.fields,
    })
    .select(COLUMNS)
    .single();
  if (error || !data) throw new Error("application_insert_failed");
  return toApplication(data as Row);
}

// Update only if nobody changed it since we read it (version check).
async function saveIfUnchanged(studioId: string, current: Row, changes: Partial<Row>) {
  const { data } = await db
    .from("applications")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", current.id)
    .eq("studio_id", studioId)
    .eq("version", current.version)
    .select(COLUMNS)
    .maybeSingle();
  if (!data) throw new AppError(409, "version_conflict", "This application changed in another tab. Reload and try again.");
  return toApplication(data as Row);
}

// Saving answers always clears approval: the owner must review again.
export async function editApplication(studioId: string, id: string, expectedVersion: number, fields: ApplicationField[]) {
  const current = await getRow(studioId, id);
  if (current.status === "submitted_owner_reported")
    throw new AppError(409, "already_submitted", "This application was already submitted. Start a new one to make changes.");
  if (current.version !== expectedVersion)
    throw new AppError(409, "version_conflict", "This application changed in another tab. Reload and try again.");
  return saveIfUnchanged(studioId, current, {
    fields,
    version: current.version + 1,
    status: "draft",
    approved_version: null,
    approved_at: null,
  });
}

// Approval is tied to one exact saved version.
export async function approveApplication(studioId: string, id: string, version: number) {
  const current = await getRow(studioId, id);
  if (current.status === "submitted_owner_reported")
    throw new AppError(409, "already_submitted", "This application was already submitted.");
  if (current.version !== version)
    throw new AppError(409, "version_conflict", "You're approving an older version. Reload and review the latest answers.");
  if (current.status === "approved_for_copying" && current.approved_version === version) return toApplication(current); // idempotent

  const missing = current.fields.filter((f) => f.needsInput || f.answer.trim() === "").map((f) => f.questionId);
  const missingRequired = current.fields.filter((f) => f.needsInput).map((f) => f.questionId);
  if (missingRequired.length)
    throw new AppError(400, "needs_input", "Some answers still need your input.", Object.fromEntries(missing.map((q) => [q, ["Needs your input"]])));

  return saveIfUnchanged(studioId, current, {
    status: "approved_for_copying",
    approved_version: version,
    approved_at: new Date().toISOString(),
  });
}

// Only the owner can say it was submitted. Copying answers or opening the portal never calls this.
export async function markSubmitted(studioId: string, id: string, submittedAt?: string) {
  const current = await getRow(studioId, id);
  if (current.status === "submitted_owner_reported") return toApplication(current); // idempotent
  if (current.status !== "approved_for_copying")
    throw new AppError(409, "not_approved", "Approve the application before marking it submitted.");
  const when = submittedAt ? new Date(`${submittedAt}T12:00:00Z`) : new Date();
  if (when.getTime() > Date.now() + 24 * 3600 * 1000)
    throw new AppError(400, "invalid_date", "Submission date can't be in the future.");
  return saveIfUnchanged(studioId, current, {
    status: "submitted_owner_reported",
    submitted_at: when.toISOString(),
  });
}

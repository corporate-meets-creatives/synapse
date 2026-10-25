import { db } from "./supabase.js";
import { newToken, hashToken } from "./tokens.js";
import type { StudioProfileInput, InstructorInput } from "../../shared/schemas.js";

export async function createStudio(profile: StudioProfileInput, instructors: InstructorInput[]) {
  const token = newToken();
  const { data: studio, error } = await db
    .from("studios")
    .insert({ token_hash: hashToken(token), profile })
    .select("id, profile, created_at, updated_at")
    .single();
  if (error || !studio) throw new Error("studio_insert_failed");
  const saved = await syncInstructors(studio.id, instructors);
  return { token, studio: { ...studio, instructors: saved } };
}

export async function findStudioByToken(token: string) {
  const { data } = await db
    .from("studios")
    .select("id, profile, created_at, updated_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!data) return null;
  const { data: instructors } = await db
    .from("instructors").select("id, name, data")
    .eq("studio_id", data.id).order("created_at");
  return { ...data, instructors: (instructors ?? []).map(toInstructor) };
}

export async function updateStudio(studioId: string, profile: StudioProfileInput, instructors: InstructorInput[]) {
  const { error } = await db
    .from("studios")
    .update({ profile, updated_at: new Date().toISOString() })
    .eq("id", studioId);
  if (error) throw new Error("studio_update_failed");
  return syncInstructors(studioId, instructors);
}

// Keeps instructor IDs stable; never touches another studio's rows.
async function syncInstructors(studioId: string, input: InstructorInput[]) {
  const { data: existing } = await db.from("instructors").select("id").eq("studio_id", studioId);
  const owned = new Set((existing ?? []).map((r) => r.id as string));

  for (const i of input) if (i.id && !owned.has(i.id)) throw new Error("instructor_not_owned");

  const keep = new Set(input.filter((i) => i.id).map((i) => i.id!));
  const toDelete = [...owned].filter((id) => !keep.has(id));
  if (toDelete.length) await db.from("instructors").delete().eq("studio_id", studioId).in("id", toDelete);

  for (const i of input.filter((i) => i.id)) {
    const { id, name, ...data } = i;
    await db.from("instructors").update({ name, data }).eq("id", id!).eq("studio_id", studioId);
  }

  const fresh = input.filter((i) => !i.id).map(({ name, ...rest }) => {
    const { id: _ignored, ...data } = rest as InstructorInput;
    return { studio_id: studioId, name, data };
  });
  if (fresh.length) await db.from("instructors").insert(fresh);

  const { data: all } = await db
    .from("instructors").select("id, name, data")
    .eq("studio_id", studioId).order("created_at");
  return (all ?? []).map(toInstructor);
}

// DB row -> shape the frontend expects (matches Instructor in shared/schemas)
function toInstructor(r: { id: string; name: string; data: Record<string, unknown> }) {
  return { id: r.id, name: r.name, ...r.data };
}

import { z } from "zod";
import { StudioProfileInput } from "../../shared/schemas.js";
import { confirmedValue, read, DERIVED, type ProfileLike } from "../drafting/confirm.js";
import { getForm, listForms } from "../drafting/form.js";
import type { Question as FormQuestion } from "../drafting/types.js";
import { catalog, evaluateProvider } from "./evaluate.js";
import { basisOf, evaluateRequirement } from "./rules.js";
import { MatchInstructor, type Basis, type FitLabel, type MatchEntry } from "./types.js";

export class QuestionsInputError extends Error {}

// ---------- request ----------
const StudioShape = StudioProfileInput.partial().extend({
  classTypes: z.array(z.string()).optional(),
  googleBusinessProfileVerified: z.boolean().optional(),
  hasPriceList: z.boolean().optional(),
});
const AnswerIn = z.object({
  /** studio.<field> | instructor.<field> | instructor.requirementAnswers.<key> | application.<questionId> */
  field: z.string().min(3).max(120),
  /** null / "unknown" / "" means "I don't know": kept as unknown, never guessed. */
  value: z.union([z.string().max(2000), z.boolean(), z.number(), z.array(z.string().max(100)).max(30), z.null()]),
});
export const QuestionsRequest = z.object({
  providerId: z.string().min(1).max(64),
  studio: StudioShape,
  studioConfirmed: z.boolean().optional(),
  instructors: z.array(MatchInstructor).max(50).default([]),
  instructorId: z.string().max(64).optional(), // the one instructor chosen for an instructor-specific application
  newInstructor: z.object({ name: z.string().min(1).max(200) }).optional(), // add one instructor on the spot
  answers: z.array(AnswerIn).max(100).default([]), // new answers AND corrections to existing ones
  existingAnswers: z.array(z.object({ questionId: z.string(), answer: z.string().max(10000) })).max(100).default([]), // application-form answers already given
});
export type QuestionsRequest = z.infer<typeof QuestionsRequest>;

// ---------- response ----------
export type InputType = "yes_no" | "text" | "list" | "choice" | "number";
export interface FollowUpQuestion {
  id: string; // requirement id or form question id: stable
  field: string; // where the answer is written (see AnswerIn.field)
  label: string;
  type: InputType;
  options?: string[];
  why: string; // why we need this detail
  source: "requirement" | "form";
}
export interface ConfirmedItem {
  id: string;
  field: string;
  label: string;
  value: unknown;
  basis: Basis | "owner_reported";
  result?: "met" | "not_met" | "unknown"; // for requirements
  editable: true; // the owner can correct any of these via `answers`
  needsConfirmation?: boolean; // we hold a value (e.g. read from the website) but the owner hasn't confirmed it yet
}
export interface QuestionsResponse {
  providerId: string;
  providerName: string;
  form: { version: string; isDemo: boolean } | null;
  instructorSelection: { required: boolean; selectedId: string | null; options: { id: string; name: string }[]; canAdd: boolean };
  instructors: MatchInstructor[]; // with answers applied (and the new instructor, if added)
  studio: z.infer<typeof StudioShape>; // with answers applied
  questions: FollowUpQuestion[];
  confirmed: ConfirmedItem[]; // skipped because already confirmed; correctable
  unknownFields: string[]; // answered "don't know": preserved as unknown
  readiness: { fitLabel: FitLabel; readiness: MatchEntry["readiness"]; missingToApply: string[]; blockers: string[]; eligibilityConfirmed: false } | null;
  /** Application-form answers to pass to POST /api/draft as existingAnswers (owner-edited). */
  existingAnswers: { questionId: string; answer: string; provenance: "owner_edited"; needsInput: false }[];
  done: boolean;
}

// ---------- applying answers ----------
const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);
const STUDIO_FIELDS = new Set([...Object.keys(StudioShape.shape).filter((k) => k !== "fieldMeta")]);
const KEY = /^[A-Za-z][A-Za-z0-9_]{0,60}$/;
const QID = /^[A-Za-z][A-Za-z0-9_.-]{0,80}$/; // form question ids, e.g. "forma.intent"
const isUnknown = (v: unknown) => v === null || v === "" || (typeof v === "string" && v.trim().toLowerCase() === "unknown");

function toBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (["yes", "y", "true"].includes(t)) return true;
    if (["no", "n", "false"].includes(t)) return false;
  }
  return undefined;
}
const toList = (v: unknown): string[] => (Array.isArray(v) ? v : String(v).split(",")).map((x) => String(x).trim()).filter(Boolean);

const BOOL_STUDIO = new Set(["hasLiabilityInsurance", "googleBusinessProfileVerified", "hasPriceList"]);
const LIST_STUDIO = new Set(["classTypes", "danceStyles"]);

export function applyAnswers(req: QuestionsRequest) {
  const studio: Record<string, unknown> = { ...req.studio, fieldMeta: { ...(req.studio.fieldMeta ?? {}) } };
  const instructors: MatchInstructor[] = req.instructors.map((i) => ({ ...i, requirementAnswers: { ...i.requirementAnswers } }));
  let instructorId = req.instructorId;
  if (req.newInstructor) {
    instructorId = `new-${globalThis.crypto.randomUUID()}`;
    instructors.push(MatchInstructor.parse({ id: instructorId, name: req.newInstructor.name.trim() }));
  }
  const target = instructors.find((i) => i.id === instructorId) ?? null;
  const appAnswers = new Map(req.existingAnswers.map((a) => [a.questionId, a.answer]));
  const unknownFields: string[] = [];

  for (const a of req.answers) {
    const parts = a.field.split(".");
    if (parts.some((p) => FORBIDDEN.has(p))) throw new QuestionsInputError(`Invalid field: ${a.field}`);
    const [scope, ...rest] = parts;
    if (isUnknown(a.value)) {
      unknownFields.push(a.field); // preserved as unknown: nothing is written
      continue;
    }
    if (scope === "studio" && rest.length === 1 && STUDIO_FIELDS.has(rest[0])) {
      const f = rest[0];
      const v = BOOL_STUDIO.has(f) ? toBool(a.value) : LIST_STUDIO.has(f) ? toList(a.value) : String(a.value).trim();
      if (v === undefined) throw new QuestionsInputError(`Answer for ${a.field} must be yes or no.`);
      studio[f] = v;
      (studio.fieldMeta as Record<string, unknown>)[f] = { provenance: "owner_edited" };
    } else if (scope === "instructor") {
      if (!target) throw new QuestionsInputError("Select or add an instructor before answering instructor questions.");
      if (rest.length === 1 && rest[0] === "cprCertified") {
        const b = toBool(a.value);
        if (b === undefined) throw new QuestionsInputError(`Answer for ${a.field} must be yes or no.`);
        target.cprCertified = b;
      } else if (rest.length === 1 && rest[0] === "certifications") target.certifications = toList(a.value).slice(0, 20);
      else if (rest.length === 1 && rest[0] === "name") target.name = String(a.value).trim().slice(0, 200);
      else if (rest.length === 2 && rest[0] === "requirementAnswers" && KEY.test(rest[1])) {
        const b = toBool(a.value);
        target.requirementAnswers[rest[1]] = b ?? (typeof a.value === "string" || typeof a.value === "number" ? a.value : null);
      } else throw new QuestionsInputError(`Unknown field: ${a.field}`);
    } else if (scope === "application" && rest.length >= 1 && QID.test(rest.join("."))) {
      appAnswers.set(rest.join("."), Array.isArray(a.value) ? a.value.join(", ") : String(a.value));
    } else throw new QuestionsInputError(`Unknown field: ${a.field}`);
  }
  return { studio, instructors, instructorId: target?.id ?? null, appAnswers, unknownFields: [...new Set(unknownFields)] };
}

// ---------- building questions ----------
const blank = (v: unknown) => v === undefined || v === null || (typeof v === "string" && v.trim() === "") || (Array.isArray(v) && v.length === 0);
const formType = (q: FormQuestion): InputType =>
  q.type === "single_choice" && q.options?.length === 2 && q.options.includes("Yes") && q.options.includes("No") ? "yes_no" : q.type === "single_choice" || q.type === "multi_choice" ? "choice" : q.type === "number" ? "number" : q.type === "long_text" ? "text" : "text";

/** The profile value whether or not the owner confirmed it (derived name parts included). */
function rawValue(facts: { studio: Record<string, unknown>; instructor: Record<string, unknown> }, path: string): unknown {
  const d = DERIVED[path];
  if (d) {
    const src = read(facts, `studio.${d.from}`);
    return typeof src === "string" && src.trim() ? d.value(src) : undefined;
  }
  return read(facts, path);
}

/** Derived name parts are asked as one question about the contact name. */
const askField = (path: string) => (DERIVED[path] ? "studio.contactName" : path);

export function buildQuestions(req: QuestionsRequest): QuestionsResponse {
  const prov = catalog.find((p) => p.id === req.providerId);
  const hasForm = listForms().some((f) => f.providerId === req.providerId);
  if (!prov && !hasForm) throw new QuestionsInputError(`Unknown provider "${req.providerId}".`);
  const form = hasForm ? getForm(req.providerId) : null;
  const name = prov?.name ?? form?.title ?? req.providerId;

  const applied = applyAnswers(req);
  const instructorSpecific = (prov?.applicantType ?? form?.applicantType) === "instructor";
  const target = applied.instructors.find((i) => i.id === applied.instructorId) ?? null;
  const selection = {
    required: instructorSpecific,
    selectedId: target?.id ?? null,
    options: applied.instructors.map((i) => ({ id: i.id, name: i.name })),
    canAdd: true,
  };

  const out: Omit<QuestionsResponse, "questions" | "confirmed" | "readiness" | "done"> & { questions: FollowUpQuestion[]; confirmed: ConfirmedItem[] } = {
    providerId: req.providerId,
    providerName: name,
    form: form ? { version: form.version, isDemo: form.isDemo } : null,
    instructorSelection: selection,
    instructors: applied.instructors,
    studio: applied.studio as z.infer<typeof StudioShape>,
    questions: [],
    confirmed: [],
    unknownFields: applied.unknownFields,
    existingAnswers: [...applied.appAnswers].filter(([, a]) => a.trim()).map(([questionId, answer]) => ({ questionId, answer, provenance: "owner_edited" as const, needsInput: false as const })),
  };

  // Instructor-specific: studio details alone are never enough, so the instructor is chosen first.
  if (instructorSpecific && !target) {
    return { ...out, readiness: prov ? readinessOf(evaluateProvider(prov, applied.studio as never, null, req.studioConfirmed === true)) : null, done: false };
  }

  const profile: ProfileLike = { studio: applied.studio, instructor: (target ?? undefined) as Record<string, unknown> | undefined, studioConfirmed: req.studioConfirmed };
  const facts = { studio: applied.studio, instructor: (target ?? {}) as Record<string, unknown>, studioConfirmed: req.studioConfirmed };
  const seen = new Set<string>();

  // 1) Eligibility questions from the provider's requirements (application stage only: onboarding never blocks a start).
  for (const r of prov?.requirements ?? []) {
    if (r.stage !== "application") continue;
    const res = evaluateRequirement(r, facts);
    if (!res) continue; // not applicable
    if (res.result !== "unknown") {
      const a = r.asks[0];
      if (a && !seen.has(a.field)) {
        seen.add(a.field);
        const basis = res.basis ?? basisOf(a.field, facts);
        out.confirmed.push({ id: r.id, field: a.field, label: a.question, value: read(facts, a.field), basis, result: res.result, editable: true, ...(basis === "extracted" ? { needsConfirmation: true } : {}) });
      }
      continue;
    }
    for (const a of r.asks) {
      const current = read(facts, a.field);
      if (!blank(current) || seen.has(a.field) || applied.unknownFields.includes(a.field)) continue;
      seen.add(a.field);
      out.questions.push({ id: r.id, field: a.field, label: a.question, type: a.type, why: a.why, source: "requirement" });
    }
  }

  // 2) Questions from the selected provider's form: only required ones we can't already answer from confirmed facts.
  for (const q of form?.questions ?? []) {
    if (q.sensitive || q.declaration || !q.required) continue; // tax/banking/declarations go to the provider portal
    if (q.draftable && q.profileField) continue; // narrative: drafted, not asked
    const existing = req.existingAnswers.find((a) => a.questionId === q.id) ?? out.existingAnswers.find((a) => a.questionId === q.id);
    if (q.profileField) {
      const field = askField(q.profileField);
      const val = confirmedValue(profile, q.profileField);
      if (!blank(val) && !(q.options && !q.options.includes(typeof val === "boolean" ? (val ? "Yes" : "No") : String(val)))) {
        if (!seen.has(field)) {
          seen.add(field);
          out.confirmed.push({ id: q.id, field, label: q.label, value: val, basis: basisOf(q.profileField, facts), editable: true });
        }
        continue;
      }
      const held = rawValue(facts, q.profileField);
      if (!blank(held) && !(q.options && !q.options.includes(typeof held === "boolean" ? (held ? "Yes" : "No") : String(held)))) {
        // We already have it (e.g. read from the website): ask the owner to confirm, not to retype it.
        if (!seen.has(field)) {
          seen.add(field);
          out.confirmed.push({ id: q.id, field, label: q.label, value: held, basis: basisOf(q.profileField, facts), editable: true, needsConfirmation: true });
        }
        continue;
      }
      if (seen.has(field) || applied.unknownFields.includes(field)) continue;
      seen.add(field);
      out.questions.push({ id: q.id, field, label: q.label, type: formType(q), ...(q.options ? { options: q.options } : {}), why: q.helpText ?? `The ${name} application requires this.`, source: "form" });
    } else {
      const field = `application.${q.id}`;
      if (existing?.answer.trim() || applied.unknownFields.includes(field)) continue;
      out.questions.push({ id: q.id, field, label: q.label, type: formType(q), ...(q.options ? { options: q.options } : {}), why: q.helpText ?? `The ${name} application asks this and only you can decide it.`, source: "form" });
    }
  }

  const entry = prov ? evaluateProvider(prov, applied.studio as never, target, req.studioConfirmed === true) : null;
  return { ...out, readiness: entry ? readinessOf(entry) : null, done: out.questions.length === 0 };
}

const readinessOf = (m: MatchEntry) => ({ fitLabel: m.fitLabel, readiness: m.readiness, missingToApply: m.missingToApply, blockers: m.blockers, eligibilityConfirmed: false as const });

export function runQuestions(body: unknown): QuestionsResponse {
  const parsed = QuestionsRequest.safeParse(body);
  if (!parsed.success) throw new QuestionsInputError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  return buildQuestions(parsed.data);
}

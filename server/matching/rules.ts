import type { Basis, CatalogRequirement, Condition, RequirementResult, Result } from "./types.js";

export interface Facts {
  studio: Record<string, unknown>;
  instructor: Record<string, unknown>;
  studioConfirmed?: boolean; // owner confirmed the whole studio profile
}

const RANK: Record<Basis, number> = { extracted: 0, owner_reported: 1, owner_confirmed: 2 };

/** How trustworthy the evidence for one field is: website/AI extraction < owner-entered < owner-confirmed. */
export function basisOf(field: string, facts: Facts): Basis {
  const [scope, ...rest] = field.split(".");
  if (scope === "instructor") return facts.instructor.confirmed === true ? "owner_confirmed" : "owner_reported";
  if (facts.studioConfirmed === true) return "owner_confirmed";
  const meta = (facts.studio.fieldMeta as Record<string, { provenance?: string }> | undefined)?.[rest[0]]?.provenance;
  if (meta === "owner_confirmed" || meta === "owner_edited") return "owner_confirmed";
  if (meta === "ai_draft") return "extracted";
  return "owner_reported";
}
const weakest = (bs: Basis[]): Basis => bs.reduce((a, b) => (RANK[b] < RANK[a] ? b : a));

const missing = (v: unknown) => v === undefined || v === null;

function read(facts: Facts, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), facts);
}

/** A single check. Missing input => "unknown" (never "not_met"). */
export function checkCondition(c: Condition, facts: Facts): Result {
  const v = read(facts, c.field);
  if (missing(v)) return "unknown";
  switch (c.op) {
    case "is_true":
      return v === true ? "met" : "not_met";
    case "is_false":
      return v === false ? "met" : "not_met";
    case "nonempty":
      // An empty list/string means "nothing recorded", which is unknown, not a failed requirement.
      return (Array.isArray(v) ? v.length > 0 : String(v).trim() !== "") ? "met" : "unknown";
    case "equals":
      return v === c.value ? "met" : "not_met";
    case "gte":
      return Number(v) >= Number(c.value) ? "met" : "not_met";
  }
}

/** all: not_met if any not_met, else unknown if any unknown, else met. any: met if any met, else unknown if any unknown, else not_met. */
export function evaluateRequirement(req: CatalogRequirement, facts: Facts): RequirementResult | null {
  // Conditional requirements are evaluated only once the condition is known to apply.
  if (req.appliesWhen && checkCondition(req.appliesWhen, facts) !== "met") return null;
  let result: Result;
  let metFields: string[];
  if (req.rule.all) {
    const rs = req.rule.all.map((c) => checkCondition(c, facts));
    result = rs.includes("not_met") ? "not_met" : rs.includes("unknown") ? "unknown" : "met";
    metFields = req.rule.all.map((c) => c.field);
  } else {
    const conds = req.rule.any ?? [];
    const rs = conds.map((c) => checkCondition(c, facts));
    result = rs.includes("met") ? "met" : rs.includes("unknown") ? "unknown" : "not_met";
    metFields = conds.filter((_, i) => rs[i] === "met").map((c) => c.field).slice(0, 1);
  }
  const basis = result === "met" && metFields.length ? weakest(metFields.map((f) => basisOf(f, facts))) : undefined;
  return { requirementId: req.id, label: req.label, stage: req.stage, result, ...(basis ? { basis } : {}), ...(req.source ? { source: req.source } : {}) };
}

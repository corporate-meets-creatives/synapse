import type { CatalogRequirement, Condition, RequirementResult, Result } from "./types.js";

export interface Facts {
  studio: Record<string, unknown>;
  instructor: Record<string, unknown>;
}

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
  if (req.rule.all) {
    const rs = req.rule.all.map((c) => checkCondition(c, facts));
    result = rs.includes("not_met") ? "not_met" : rs.includes("unknown") ? "unknown" : "met";
  } else {
    const rs = (req.rule.any ?? []).map((c) => checkCondition(c, facts));
    result = rs.includes("met") ? "met" : rs.includes("unknown") ? "unknown" : "not_met";
  }
  return { requirementId: req.id, label: req.label, stage: req.stage, result, ...(req.source ? { source: req.source } : {}) };
}

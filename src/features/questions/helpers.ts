import type { ConfirmedItem, FollowUpQuestion } from "../../lib/api";

export type FieldSpec = Pick<FollowUpQuestion, "id" | "field" | "label" | "type" | "options"> & { hint?: string };

/** What kind of control to use when correcting an already-confirmed value. */
export function specForConfirmed(c: ConfirmedItem): FieldSpec {
  const type: FieldSpec["type"] = typeof c.value === "boolean" ? "yes_no" : Array.isArray(c.value) ? "list" : "text";
  return { id: c.id, field: c.field, label: c.label, type };
}

export const display = (v: unknown): string =>
  v === true ? "Yes" : v === false ? "No" : Array.isArray(v) ? v.join(", ") : v === undefined || v === null || v === "" ? "Not answered yet" : String(v);

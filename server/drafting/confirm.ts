/** Reads profile facts the owner has confirmed. Shared by drafting and the follow-up questions. */
export interface ProfileLike {
  studio: Record<string, unknown>;
  instructor?: Record<string, unknown>;
  studioConfirmed?: boolean;
}

export const read = (root: Record<string, unknown>, path: string): unknown => path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), root);

/** Profile fields derived in code from a confirmed field (first/last name from contactName). */
export const DERIVED: Record<string, { from: string; value: (src: string) => string }> = {
  "studio.contactFirstName": { from: "contactName", value: (s) => s.trim().split(/\s+/)[0] ?? "" },
  "studio.contactLastName": { from: "contactName", value: (s) => s.trim().split(/\s+/).slice(1).join(" ") },
};

export function isStudioFieldConfirmed(p: ProfileLike, field: string): boolean {
  const meta = (p.studio.fieldMeta ?? {}) as Record<string, { provenance?: string }>;
  return p.studioConfirmed === true || ["owner_confirmed", "owner_edited"].includes(meta[field]?.provenance ?? "");
}

/** The value of a profile path, only if the owner confirmed it; otherwise undefined. */
export function confirmedValue(p: ProfileLike, path: string): unknown {
  const [scope, ...rest] = path.split(".");
  if (scope === "instructor") return p.instructor?.confirmed === true ? read({ instructor: p.instructor }, path) : undefined;
  const derived = DERIVED[path];
  if (derived) {
    const src = isStudioFieldConfirmed(p, derived.from) ? read({ studio: p.studio }, `studio.${derived.from}`) : undefined;
    return typeof src === "string" && src.trim() ? derived.value(src) : undefined;
  }
  return isStudioFieldConfirmed(p, rest[0]) ? read({ studio: p.studio }, path) : undefined;
}

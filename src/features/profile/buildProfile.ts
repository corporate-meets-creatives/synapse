import type { StudioProfileInput } from "../../../shared/schemas";

export type Draft = Partial<StudioProfileInput> & { category?: string; services?: string[] };

const clean = (v?: string) => (v && v.trim() ? v.trim() : undefined);

/** Turn the reviewed summary into the profile we save. Extracted values become owner-confirmed only when the owner confirms. */
export function buildProfile(p: Draft): StudioProfileInput {
  let website = clean(p.website);
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  const fieldMeta = Object.fromEntries(
    Object.entries(p.fieldMeta ?? {}).map(([k, m]) => [k, { ...m, provenance: m.provenance === "ai_draft" ? "owner_confirmed" : m.provenance }]),
  ) as StudioProfileInput["fieldMeta"];
  return {
    name: (p.name ?? "").trim(), website, address: clean(p.address), zip: clean(p.zip), city: (p.city ?? "").trim(), state: (p.state ?? "").trim(),
    phone: clean(p.phone), email: clean(p.email), contactName: clean(p.contactName), description: clean(p.description),
    danceStyles: (p.danceStyles ?? []).map((s) => s.trim()).filter(Boolean),
    classTypes: (p.classTypes ?? []).map((s) => s.trim()).filter(Boolean),
    schedulingPlatform: clean(p.schedulingPlatform), hasLiabilityInsurance: p.hasLiabilityInsurance,
    googleBusinessProfileVerified: p.googleBusinessProfileVerified, hasPriceList: p.hasPriceList,
    legalStructure: clean(p.legalStructure), yearsOperating: p.yearsOperating, employeeCount: p.employeeCount, fieldMeta,
  };
}

/** The few facts we can't save without. Everything else can be added later. */
export const MUST_HAVE: { key: "name" | "city" | "state"; label: string }[] = [
  { key: "name", label: "Business name" }, { key: "city", label: "City" }, { key: "state", label: "State" },
];

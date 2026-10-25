import data from "../../data/providers.json";

export type CatalogProvider = {
  id: string; name: string; summary: string; applicantType: "studio" | "instructor";
  workflowMode: "prepare_application" | "external_link"; applicationUrl: string;
  applicationUrlVerified: boolean; sourceUrls: string[]; lastChecked: string; requirementsVerified: boolean;
};

export const providers = (data as unknown as { providers: CatalogProvider[] }).providers;
export const providerById = (id: string) => providers.find((p) => p.id === id);

export const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

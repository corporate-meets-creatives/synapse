import type { ApplicationField, Studio } from "../../shared/schemas";

// The questions every provider asks first. Each maps to a confirmed profile field, or stays blank for the owner.
export const FORM_VERSION = "wellyfish-basic-2026-10-25";

export type Question = {
  id: string; label: string; hint?: string; section: "Business" | "Contact" | "About your classes";
  long?: boolean; required: boolean; fromProfile?: (s: Studio) => string | undefined; profileField?: string;
};

export const QUESTIONS: Question[] = [
  { id: "business_name", label: "Business name", section: "Business", required: true, profileField: "name", fromProfile: (s) => s.profile.name },
  { id: "website", label: "Website", section: "Business", required: false, profileField: "website", fromProfile: (s) => s.profile.website },
  { id: "address", label: "Street address", section: "Business", required: true, profileField: "address", fromProfile: (s) => s.profile.address },
  { id: "city_state_zip", label: "City, state and ZIP", section: "Business", required: true,
    fromProfile: (s) => [s.profile.city, [s.profile.state, s.profile.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ") || undefined },
  { id: "contact_name", label: "Contact name", section: "Contact", required: true, profileField: "contactName", fromProfile: (s) => s.profile.contactName },
  { id: "email", label: "Contact email", section: "Contact", required: true, profileField: "email", fromProfile: (s) => s.profile.email },
  { id: "phone", label: "Business phone", section: "Contact", required: true, profileField: "phone", fromProfile: (s) => s.profile.phone },
  { id: "class_types", label: "Dance styles and class types", section: "About your classes", required: true,
    fromProfile: (s) => [...s.profile.danceStyles, ...s.profile.classTypes].join(", ") || undefined },
  { id: "description", label: "Tell them about your studio", section: "About your classes", long: true, required: true,
    profileField: "description", fromProfile: (s) => s.profile.description },
  { id: "why_partner", label: "Why do you want to partner with them?", hint: "A few sentences in your own words.",
    section: "About your classes", long: true, required: true },
];

export const questionById = (id: string) => QUESTIONS.find((q) => q.id === id);

export function prefill(studio: Studio): ApplicationField[] {
  return QUESTIONS.map((q) => {
    const value = q.fromProfile?.(studio)?.trim() ?? "";
    const meta = q.profileField ? studio.profile.fieldMeta[q.profileField] : undefined;
    const provenance = meta?.provenance === "ai_draft" ? "ai_draft" : "owner_confirmed";
    return { questionId: q.id, answer: value, provenance, needsInput: q.required && !value };
  });
}

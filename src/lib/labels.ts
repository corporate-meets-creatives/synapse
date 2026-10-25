import type { Application } from "../../shared/schemas";
import type { MatchEntry } from "./api";

export const fitLabel: Record<MatchEntry["readiness"], { text: string; tone: "lagoon" | "jelly" | "coral" }> = {
  ready: { text: "Potential fit", tone: "lagoon" },
  missing_items: { text: "Needs verification", tone: "jelly" },
  not_a_fit: { text: "Does not meet a requirement", tone: "coral" },
};

// Backend statuses shown with the dashboard's wording.
export function statusLabel(a: Application): { text: string; tone: "lagoon" | "jelly" | "coral" | "ocean"; next: string } {
  if (a.status === "submitted_owner_reported")
    return { text: "Submitted", tone: "lagoon", next: "Wait for the provider to reply" };
  if (a.status === "approved_for_copying")
    return { text: "Ready for external submission", tone: "ocean", next: "Finish on the provider's website" };
  if (a.fields.some((f) => f.needsInput))
    return { text: "Draft", tone: "coral", next: "Answer the remaining questions" };
  return { text: "Ready for review", tone: "jelly", next: "Review and approve your answers" };
}

// Instructor yes/no questions the matcher reads. Never collects tax or bank details.
export const INSTRUCTOR_QUESTIONS: { key: string; label: string }[] = [
  { key: "adultAttested", label: "18 or older" },
  { key: "hasTeachingCertification", label: "Has a group fitness or teaching certification" },
  { key: "teachesSignatureClasses", label: "Wants to teach SilverSneakers signature classes" },
  { key: "hasSpecialtyCertification", label: "Has a specialty certification for that format" },
  { key: "hasLiabilityInsurance", label: "Has professional liability insurance" },
];

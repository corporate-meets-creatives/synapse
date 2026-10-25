import type { Application } from "../../shared/schemas";
import type { MatchEntry } from "./api";

// The three wordings the product uses. None of them says the business is eligible: only the provider decides.
export const FIT_TEXTS = ["Potential fit", "More information needed", "Known requirement not met"] as const;
export type FitText = (typeof FIT_TEXTS)[number];
const FIT_TONE: Record<FitText, "lagoon" | "jelly" | "coral"> = { "Potential fit": "lagoon", "More information needed": "jelly", "Known requirement not met": "coral" };
const FROM_READINESS: Record<MatchEntry["readiness"], FitText> = { ready: "Potential fit", missing_items: "More information needed", not_a_fit: "Known requirement not met" };

export function fitOf(m: MatchEntry): { text: FitText; tone: "lagoon" | "jelly" | "coral" } {
  const text = m.fitLabel ?? FROM_READINESS[m.readiness]; // older API responses only have readiness
  return { text, tone: FIT_TONE[text] };
}

// How much we trust the link to a provider's application.
export function linkStatus(m: MatchEntry): { text: string; tone: "lagoon" | "jelly" } {
  if (m.linkEvidence?.status === "unverified" || (!m.linkEvidence && !m.applicationUrlVerified)) return { text: "Link not yet verified", tone: "jelly" };
  return { text: m.linkEvidence?.status === "reachable" ? "Link checked" : "Link provided by our team", tone: "lagoon" };
}

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

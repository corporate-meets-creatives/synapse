import flexJson from "../../data/flex-form.json" with { type: "json" };
import fitonJson from "../../data/forms/fiton.json" with { type: "json" };
import formaJson from "../../data/forms/forma.json" with { type: "json" };
import { FormDef } from "./types.js";

// One entry per form. Adding a provider form = adding a JSON file here.
const forms: FormDef[] = [flexJson, formaJson, fitonJson].map((j) => FormDef.parse(j));

export class DraftInputError extends Error {}

export function getForm(providerId: string): FormDef {
  const f = forms.find((x) => x.providerId === providerId);
  if (!f) throw new DraftInputError(`No application form for provider "${providerId}".`);
  return f;
}

export const listForms = () =>
  forms.map((f) => ({ providerId: f.providerId, title: f.title, version: f.version, isDemo: f.isDemo, applicantType: f.applicantType, submissionMethod: f.submissionMethod, questionCount: f.questions.length }));

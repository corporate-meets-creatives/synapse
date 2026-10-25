import { useEffect, useState } from "react";
import type { Application } from "../../shared/schemas";
import { api, type FormDef } from "./api";
import { FORM_VERSION, QUESTIONS } from "./forms";

// One question shape for every screen, whether it comes from a provider's real form or our basic set.
export type UiQuestion = {
  id: string; label: string; hint?: string; section: string; long: boolean; required: boolean;
  options?: string[]; ownerOnly: boolean; draftable: boolean;
};

const fromBasic = (): UiQuestion[] =>
  QUESTIONS.map((q) => ({ id: q.id, label: q.label, hint: q.hint, section: q.section, long: !!q.long, required: q.required, ownerOnly: false, draftable: false }));

const SECTION: Record<string, string> = { studio: "Studio", instructor: "Instructor", class: "Classes" };
const fromForm = (f: FormDef): UiQuestion[] =>
  f.questions.map((q) => ({
    id: q.id, label: q.label, hint: q.helpText,
    section: q.section ?? (q.sensitive || q.declaration ? "Finish on the vendor's portal" : SECTION[q.id.split(".")[1]?.split("_")[0] ?? ""] ?? "Application"),
    long: q.type === "long_text", required: q.required, options: q.type === "single_choice" ? q.options : undefined,
    ownerOnly: !!(q.sensitive || q.declaration), draftable: !!q.draftable,
  }));

const cache = new Map<string, FormDef | null>();

export function useQuestions(app: Application | null) {
  const usesForm = !!app && app.formVersion !== FORM_VERSION;
  const key = app ? app.providerId : "";
  const [form, setForm] = useState<FormDef | null | undefined>(() => (usesForm ? cache.get(key) : null));
  useEffect(() => {
    if (!usesForm || cache.has(key)) return;
    let live = true;
    api.form(key)
      .then((f) => { cache.set(key, f); if (live) setForm(f); })
      .catch(() => { cache.set(key, null); if (live) setForm(null); });
    return () => { live = false; };
  }, [usesForm, key]);
  const resolved = usesForm ? (form ?? cache.get(key)) : null;
  const loading = usesForm && resolved === undefined;
  const questions = !app ? [] : resolved ? fromForm(resolved) : fromBasic();
  return { questions, form: resolved ?? null, loading };
}

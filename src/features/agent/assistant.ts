import type { Application } from "../../../shared/schemas";
import type { FormDef } from "../../lib/api";
import type { UiQuestion } from "../../lib/useQuestions";

// ---- talking to the Wellyfish browser assistant (a Chrome extension; see agent/autofill/README.md) ----
export type FillPacket = {
  v: 1; providerId: string; adapter: "hubspot"; site: { origin: string; pathPrefix: string }; expectedFields: string[];
  fields: { questionId: string; label: string; target: string; value: string }[];
};

/** A packet exists only for approved applications on a form the assistant supports. */
export function buildPacket(form: FormDef | null, questions: UiQuestion[], app: Application): FillPacket | null {
  const names = form?.structureSnapshot?.fieldNames;
  if (!form || app.status === "draft" || !form.assistant || !names?.length) return null;
  const target = new Map(form.questions.map((q) => [q.id, q.hubspotField]));
  const fields = questions
    .filter((q) => !q.ownerOnly && target.get(q.id))
    .map((q) => ({ q, a: app.fields.find((f) => f.questionId === q.id) }))
    .filter((x): x is { q: UiQuestion; a: NonNullable<typeof x.a> } => !!x.a && !!x.a.answer.trim())
    .map(({ q, a }) => ({ questionId: q.id, label: q.label, target: target.get(q.id)!, value: a.answer.trim() }));
  if (!fields.length) return null;
  return { v: 1, providerId: form.providerId, adapter: form.assistant.adapter, site: form.assistant.site, expectedFields: names, fields };
}

const SRC = "wellyfish-page";
const EXT = "wellyfish-extension";

/** Resolves true if the assistant answers within a moment. */
export function detectAssistant(timeoutMs = 700): Promise<boolean> {
  return new Promise((resolve) => {
    const on = (e: MessageEvent) => { if (e.source === window && e.origin === window.location.origin && e.data?.source === EXT && e.data.type === "pong") done(true); };
    const done = (v: boolean) => { window.removeEventListener("message", on); clearTimeout(t); resolve(v); };
    const t = setTimeout(() => done(false), timeoutMs);
    window.addEventListener("message", on);
    window.postMessage({ source: SRC, type: "ping" }, window.location.origin);
  });
}

/** Hands the reviewed answers to the assistant. It only ever fills after the owner clicks "Fill the form" on the official page. */
export function sendPacket(packet: FillPacket, timeoutMs = 3000): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).slice(2);
    const on = (e: MessageEvent) => {
      if (e.source !== window || e.origin !== window.location.origin || e.data?.source !== EXT || e.data.type !== "stored" || e.data.id !== id) return;
      done({ ok: !!e.data.ok, error: e.data.error });
    };
    const done = (r: { ok: boolean; error?: string }) => { window.removeEventListener("message", on); clearTimeout(t); resolve(r); };
    const t = setTimeout(() => done({ ok: false, error: "The assistant didn't respond." }), timeoutMs);
    window.addEventListener("message", on);
    window.postMessage({ source: SRC, type: "fill-packet", id, packet }, window.location.origin);
  });
}

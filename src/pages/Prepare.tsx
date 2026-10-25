import { useEffect, useMemo, useState } from "react";
import type { ApplicationField } from "../../shared/schemas";
import { Button, Loading, Notice, Panel, Steps, TextArea, TextField } from "../components/ui";
import { navigate } from "../lib/router";
import { Link } from "../components/Link";
import { api, ApiError } from "../lib/api";
import { QUESTIONS, questionById } from "../lib/forms";
import { providerById } from "../lib/catalog";
import { matchCache } from "../lib/session";
import { NotFoundLink } from "./NotFound";
import ProvenanceBadge from "../components/ProvenanceBadge";
import { useApplication } from "../lib/useApplication";
import { APPLY_STEPS } from "../lib/steps";

export default function Prepare({ token, id }: { token: string; id: string }) {
  const { app, setApp, error } = useApplication(token, id);
  const [edited, setFields] = useState<ApplicationField[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"save" | "review" | null>(null);
  const [msg, setMsg] = useState<{ tone: "lagoon" | "coral"; text: string } | null>(null);

  const fields = edited ?? app?.fields ?? null;
  useEffect(() => { if (app?.status === "submitted_owner_reported") navigate(`/s/${token}/apply/${id}/done`, true); }, [app, token, id]);
  useEffect(() => {
    if (!fields) return;
    const target = window.location.hash.slice(1);
    if (target) document.getElementById(target)?.focus();
  }, [fields]);

  const docs = useMemo(() => {
    const m = matchCache.get(token)?.find((x) => x.providerId === app?.providerId && (x.instructorId ?? null) === (app?.instructorId ?? null));
    return m?.requirementResults.filter((r) => r.stage !== "application") ?? [];
  }, [token, app]);

  if (error) return <NotFoundLink />;
  if (!app || !fields) return <Loading label="Loading your application" />;

  const provider = providerById(app.providerId);
  const missing = fields.filter((f) => f.needsInput);
  const done = fields.length - missing.length;

  const update = (qid: string, answer: string) => {
    setDirty(true);
    setMsg(null);
    setFields((cur) => (cur ?? fields!).map((f) => {
      if (f.questionId !== qid) return f;
      const required = questionById(qid)?.required ?? false;
      return { ...f, answer, provenance: "owner_edited", needsInput: required && !answer.trim() };
    }));
  };

  async function save(): Promise<boolean> {
    if (!dirty) return true;
    try {
      const r = await api.editApplication(token, id, app!.version, fields!);
      setApp(r.application);
      setFields(r.application.fields);
      setDirty(false);
      return true;
    } catch (e) {
      setMsg({ tone: "coral", text: e instanceof ApiError ? e.message : "We couldn't save your answers." });
      return false;
    }
  }

  const sections = [...new Set(QUESTIONS.map((q) => q.section))];

  return (
    <>
      <Steps steps={APPLY_STEPS} current={0} />
      <div className="mb-6 max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">Prepare your {provider?.name ?? app.providerId} application</h1>
        <p className="mt-2 text-lg text-muted">We filled in what your confirmed profile already says. Everything else is up to you.</p>
      </div>
      {app.status === "approved_for_copying" && (
        <div className="mb-6 max-w-2xl"><Notice title="You already approved these answers">Saving a change clears that approval, and you'll review again.</Notice></div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {sections.map((sec) => (
            <Panel key={sec}>
              <h2 className="mb-4 text-xl">{sec}</h2>
              <div className="space-y-5">
                {QUESTIONS.filter((q) => q.section === sec).map((q) => {
                  const f = fields.find((x) => x.questionId === q.id);
                  if (!f) return null;
                  const props = { id: `q-${q.id}`, label: q.label, hint: q.hint, badge: <ProvenanceBadge field={f} />, value: f.answer };
                  return q.long
                    ? <TextArea key={q.id} {...props} rows={5} onChange={(e) => update(q.id, e.target.value)} />
                    : <TextField key={q.id} {...props} onChange={(e) => update(q.id, e.target.value)} />;
                })}
              </div>
            </Panel>
          ))}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Panel>
            <h2 className="text-xl">Checklist</h2>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-mist" aria-hidden="true">
              <div className="h-full rounded-full bg-lagoon" style={{ width: `${(done / fields.length) * 100}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted">{done} of {fields.length} answers ready</p>
            {missing.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm">
                {missing.map((f) => (
                  <li key={f.questionId}>
                    <a href={`#q-${f.questionId}`} className="text-coral-deep underline"
                      onClick={(e) => { e.preventDefault(); document.getElementById(`q-${f.questionId}`)?.focus(); }}>
                      {questionById(f.questionId)?.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {docs.length > 0 && (
              <>
                <h3 className="mt-5 text-base">Documents for later</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{docs.map((d) => <li key={d.requirementId}>{d.label}</li>)}</ul>
              </>
            )}
            {msg && <div className="mt-4"><Notice tone={msg.tone} title={msg.text} /></div>}
            <div className="mt-5 flex flex-col gap-2">
              <Button busy={busy === "review"} onClick={async () => {
                setBusy("review");
                if (await save()) navigate(`/s/${token}/apply/${id}/review`);
                setBusy(null);
              }}>Review application</Button>
              <Button variant="secondary" busy={busy === "save"} disabled={!dirty} onClick={async () => {
                setBusy("save");
                if (await save()) setMsg({ tone: "lagoon", text: "Draft saved" });
                setBusy(null);
              }}>{dirty ? "Save draft" : "Draft saved"}</Button>
            </div>
          </Panel>
          <p className="px-1 text-sm text-muted">
            Your progress is saved to your private link. <Link to={`/s/${token}/applications`} className="text-ocean underline">My applications</Link>
          </p>
        </aside>
      </div>
    </>
  );
}

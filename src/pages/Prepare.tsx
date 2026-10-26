import { useEffect, useMemo, useState } from "react";
import type { ApplicationField } from "../../shared/schemas";
import { Button, Loading, Notice, Panel, Steps, TextArea, TextField } from "../components/ui";
import { navigate } from "../lib/router";
import { Link } from "../components/Link";
import { api, ApiError } from "../lib/api";
import { providerById } from "../lib/catalog";
import { matchCache, useStudio } from "../lib/session";
import { NotFoundLink } from "./NotFound";
import ProvenanceBadge from "../components/ProvenanceBadge";
import { useApplication } from "../lib/useApplication";
import { useQuestions, type UiQuestion } from "../lib/useQuestions";
import { APPLY_STEPS } from "../lib/steps";

export default function Prepare({ token, id }: { token: string; id: string }) {
  const { app, setApp, error } = useApplication(token, id);
  const { studio } = useStudio(token);
  const { questions, form, loading } = useQuestions(app);
  const [edited, setFields] = useState<ApplicationField[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"save" | "review" | null>(null);
  const [drafting, setDrafting] = useState<string | null>(null);
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
  if (!app || !fields || loading) return <Loading label="Loading your application" />;

  const provider = providerById(app.providerId);
  const byId = new Map(questions.map((q) => [q.id, q]));
  const editable = fields.filter((f) => !byId.get(f.questionId)?.ownerOnly);
  const missing = editable.filter((f) => f.needsInput);
  const done = editable.length - missing.length;
  const who = app.instructorId ? studio?.instructors.find((i) => i.id === app.instructorId)?.name : null;

  const update = (qid: string, answer: string) => {
    setDirty(true);
    setMsg(null);
    setFields((cur) => (cur ?? fields).map((f) => {
      if (f.questionId !== qid) return f;
      const required = byId.get(qid)?.required ?? false;
      return { ...f, answer, provenance: "owner_edited", needsInput: required && !answer.trim() };
    }));
  };

  // "Help me answer": Claude drafts this one narrative answer from the confirmed profile. Unknown facts stay blank.
  async function helpMeAnswer(qid: string) {
    if (!studio) return;
    setDrafting(qid);
    setMsg(null);
    try {
      const d = await api.draft(studio, app!.providerId, app!.instructorId, fields!, [qid]);
      const fresh = d.answers.find((a) => a.questionId === qid);
      if (!fresh || !fresh.answer.trim()) {
        setMsg({ tone: "coral", text: "There isn't enough in your profile to draft this. Add a sentence yourself." });
      } else {
        setDirty(true);
        setFields((cur) => (cur ?? fields!).map((f) => (f.questionId === qid ? { ...fresh, provenance: "ai_draft", needsInput: false } : f)));
      }
    } catch (e) {
      setMsg({ tone: "coral", text: e instanceof ApiError ? e.message : "We couldn't draft that answer." });
    } finally {
      setDrafting(null);
    }
  }

  async function save(): Promise<boolean> {
    if (!dirty) return true;
    try {
      const r = await api.editApplication(token, id, app!.version, fields!);
      setApp(r.application);
      setFields(r.application.fields);
      setDirty(false);
      return true;
    } catch (e) {
      setMsg({ tone: "coral", text: e instanceof ApiError ? e.message : "We couldn't save your answers. Your edits are still here; try again." });
      return false;
    }
  }

  const sections = [...new Set(questions.map((q) => q.section))];

  const renderField = (q: UiQuestion) => {
    const f = fields.find((x) => x.questionId === q.id);
    if (!f) return null;
    if (q.ownerOnly) {
      return (
        <div key={q.id} className="rounded-field border border-dashed border-mist px-4 py-3">
          <p className="font-semibold">{q.label}</p>
          <p className="mt-1 text-sm text-muted">You'll complete this yourself on the vendor's portal. Wellyfish never collects tax or bank details, and never accepts terms or signs declarations for you.</p>
        </div>
      );
    }
    const props = { id: `q-${q.id}`, label: q.label, hint: q.hint, badge: <ProvenanceBadge field={f} />, value: f.answer };
    const help = q.draftable && (
      <Button type="button" variant="quiet" busy={drafting === q.id} disabled={!studio || drafting !== null} onClick={() => helpMeAnswer(q.id)}>
        {f.answer.trim() ? "Rewrite answer" : "Help me answer"}
      </Button>
    );
    if (q.options) {
      return (
        <div key={q.id} className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2"><label htmlFor={props.id} className="font-semibold">{q.label}</label><ProvenanceBadge field={f} /></div>
          <select id={props.id} value={f.answer} onChange={(e) => update(q.id, e.target.value)}
            className="w-full rounded-field border border-mist bg-surface px-3.5 py-2.5 text-ink">
            <option value="">Choose an answer</option>
            {q.options.map((o) => <option key={o}>{o}</option>)}
          </select>
          {q.hint && <p className="text-sm text-muted">{q.hint}</p>}
        </div>
      );
    }
    return (
      <div key={q.id}>
        {q.long ? <TextArea {...props} rows={5} onChange={(e) => update(q.id, e.target.value)} /> : <TextField {...props} onChange={(e) => update(q.id, e.target.value)} />}
        {help}
      </div>
    );
  };

  return (
    <>
      <Steps steps={APPLY_STEPS} current={0} />
      <div className="mb-6 max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">Prepare your {provider?.name ?? app.providerId} application</h1>
        <p className="mt-2 text-lg text-muted">
          {who ? `For ${who}. ` : ""}Facts come from your confirmed profile. Claude drafts only the written answers, and anything we couldn't confirm is left blank for you.
        </p>
      </div>
      <div className="mb-6 max-w-2xl space-y-3">
        {form?.isDemo && <Notice tone="jelly" title="Example form">{form.notice ?? "These questions are placeholders, not the vendor's real application."}</Notice>}
        {app.status === "approved_for_copying" && <Notice title="You already approved these answers">Saving a change clears that approval, and you'll review again.</Notice>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {sections.map((sec) => (
            <Panel key={sec}>
              <h2 className="mb-4 text-xl">{sec}</h2>
              <div className="space-y-5">{questions.filter((q) => q.section === sec).map(renderField)}</div>
            </Panel>
          ))}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Panel>
            <h2 className="text-xl">Checklist</h2>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-mist" aria-hidden="true">
              <div className="h-full rounded-full bg-lagoon" style={{ width: `${editable.length ? (done / editable.length) * 100 : 100}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted">{done} of {editable.length} answers ready</p>
            {missing.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm">
                {missing.map((f) => (
                  <li key={f.questionId}>
                    <a href={`#q-${f.questionId}`} className="text-coral-deep underline"
                      onClick={(e) => { e.preventDefault(); document.getElementById(`q-${f.questionId}`)?.focus(); }}>
                      {byId.get(f.questionId)?.label ?? f.questionId}
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

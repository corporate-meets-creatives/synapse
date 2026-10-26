import { useEffect, useState } from "react";
import { Badge, Button, Loading, Notice, Panel, Steps, TextField } from "../components/ui";
import { navigate } from "../lib/router";
import { api, ApiError, type PrefillResult } from "../lib/api";
import { useQuestions } from "../lib/useQuestions";
import { formatDate, providerById } from "../lib/catalog";
import { APPLY_STEPS } from "../lib/steps";
import { useApplication } from "../lib/useApplication";
import { useStudio } from "../lib/session";
import AssistantPanel from "../features/agent/AssistantPanel";
import { NotFoundLink } from "./NotFound";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="rounded-full border border-mist px-3 py-1 text-sm font-semibold text-ocean hover:bg-foam"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } }}>
      {copied ? "Copied" : label}
    </button>
  );
}

export default function Done({ token, id }: { token: string; id: string }) {
  const { app, setApp, error } = useApplication(token, id);
  const { questions, form, loading } = useQuestions(app);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<string | null>(null);
  const { studio } = useStudio(token);
  const [prefill, setPrefill] = useState<PrefillResult | null>(null);
  const prefillUrl = prefill?.url ?? null;

  // Forms that can be opened pre-filled (Google Forms): build the link from the approved answers, after checking the live form still matches.
  const wantsPrefill = form?.submissionMethod === "google_form_prefill" && !!studio && !!app && app.status !== "draft";
  useEffect(() => {
    if (!wantsPrefill || !studio || !app) return;
    let live = true;
    const known = app.fields.filter((f) => f.answer.trim()).map((f) => ({ ...f, provenance: "owner_edited" as const, needsInput: false }));
    api.draft(studio, app.providerId, app.instructorId, known, [], true)
      .then((r) => { if (live) setPrefill(r.prefill ?? null); })
      .catch(() => { /* the plain official link still works */ });
    return () => { live = false; };
  }, [wantsPrefill, studio, app]);

  useEffect(() => { if (app?.status === "draft") navigate(`/s/${token}/apply/${id}/review`, true); }, [app, token, id]);

  if (error) return <NotFoundLink />;
  if (!app || app.status === "draft" || loading) return <Loading label="Loading your application" />;

  const provider = providerById(app.providerId);
  const submitted = app.status === "submitted_owner_reported";
  const answers = questions.filter((q) => !q.ownerOnly).map((q) => ({ q, f: app.fields.find((x) => x.questionId === q.id) })).filter((x) => x.f && x.f.answer.trim());
  const portal = form?.portalUrl ?? provider?.applicationUrl;
  const ownerOnly = questions.filter((q) => q.ownerOnly);
  const all = answers.map(({ q, f }) => `${q.label}: ${f!.answer}`).join("\n\n");

  async function markSubmitted() {
    setBusy(true);
    setFail(null);
    try {
      const r = await api.markSubmitted(token, id, date);
      setApp(r.application);
    } catch (e) {
      setFail(e instanceof ApiError ? e.message : "We couldn't record that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Steps steps={APPLY_STEPS} current={submitted ? 3 : 2} />
      <div className="mb-6 max-w-2xl">
        {submitted ? (
          <>
            <h1 className="text-3xl sm:text-4xl">Submitted to {provider?.name}</h1>
            <p className="mt-2 text-lg text-muted">You told us you submitted on {formatDate(app.submittedAt)}. {provider?.name} will reply to you directly.</p>
            <div className="mt-3"><Badge tone="lagoon">Submitted · owner-reported</Badge></div>
          </>
        ) : (
          <>
            <h1 className="text-3xl sm:text-4xl">Your answers are ready</h1>
            <p className="mt-2 text-lg text-muted">
              Finish on {provider?.name}'s website: copy each answer into their form. Your application isn't submitted until you do.
            </p>
            <div className="mt-3"><Badge tone="ocean">Ready for external submission</Badge></div>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Panel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-xl">Your approved answers</h2>
            <CopyButton text={all} label="Copy all" />
          </div>
          <ul className="divide-y divide-mist">
            {answers.map(({ q, f }) => (
              <li key={q.id} className="flex items-start justify-between gap-4 py-3">
                <div><p className="text-sm text-muted">{q.label}</p><p className="whitespace-pre-wrap">{f!.answer}</p></div>
                <CopyButton text={f!.answer} />
              </li>
            ))}
          </ul>
          {prefill && prefill.checkedAt && (
            <div className="mt-5 rounded-field border border-mist p-4" aria-live="polite">
              <p className="font-semibold">What the pre-filled link includes</p>
              {prefill.status === "form_changed" && <div className="mt-2"><Notice tone="jelly" title="We won't pre-fill this form">{prefill.message}</Notice></div>}
              {prefill.status === "unverified" && <p className="mt-2 text-sm text-muted">{prefill.message}</p>}
              {prefill.url && (
                <ul className="mt-2 space-y-1 text-sm">
                  <li><strong>Filled in ({prefill.filled.length}):</strong> {prefill.filled.map((f) => f.label).join(", ") || "nothing"}</li>
                  {prefill.skipped.length > 0 && (
                    <li><strong>Left for you ({prefill.skipped.length}):</strong> {prefill.skipped.map((f) => `${f.label} (${{ blank: "no answer yet", unreviewed_ai_draft: "AI draft not reviewed", portal_only: "complete on their site", no_prefill_field: "can't be pre-filled" }[f.reason]})`).join("; ")}</li>
                  )}
                  {prefill.failed.length > 0 && <li><strong>Couldn't be used ({prefill.failed.length}):</strong> {prefill.failed.map((f) => `${f.label} (not one of the form's choices)`).join("; ")}</li>}
                </ul>
              )}
              {prefill.url && <p className="mt-2 text-sm text-muted">Review everything on the form before you submit it yourself. We never submit for you.</p>}
            </div>
          )}
          {ownerOnly.length > 0 && (
            <div className="mt-5 rounded-field border border-mist bg-foam p-4">
              <p className="font-semibold">Complete these yourself on {provider?.name ?? "the provider"}'s site</p>
              <p className="mt-1 text-sm text-muted">We never enter tax details, bank details, signatures or declarations for you.</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{ownerOnly.map((q) => <li key={q.id}>{q.label}</li>)}</ul>
            </div>
          )}
        </Panel>
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {!submitted && (
            <Panel>
              <h2 className="text-xl">Submit on their site</h2>
              {prefillUrl && (
                <a href={prefillUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-4 flex w-full items-center justify-center rounded-full bg-ocean px-5 py-2.5 font-semibold text-white no-underline hover:bg-ocean-deep">
                  Open the form with my answers filled in<span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
              {portal && (
                <a href={portal} target="_blank" rel="noopener noreferrer"
                  className={`${prefillUrl ? "mt-3 border-2 border-ocean bg-surface text-ocean hover:bg-foam" : "mt-4 bg-ocean text-white hover:bg-ocean-deep"} flex w-full items-center justify-center rounded-full px-5 py-2.5 font-semibold no-underline`}>
                  Open {provider?.name ?? "vendor"} portal<span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
              <p className="mt-3 text-sm text-muted">Opens in a new tab. You submit the application there; Wellyfish doesn't submit it for you, and opening it doesn't mark your application as submitted. Come back here once you've sent it.</p>
              {app.status === "approved_for_copying" && <AssistantPanel form={form} questions={questions} app={app} officialUrl={portal ?? undefined} />}
              <div className="mt-5 border-t border-mist pt-5">
                <TextField id="sub-date" label="Date you submitted" type="date" value={date} max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)} />
                {fail && <div className="mt-3"><Notice tone="coral" title={fail} /></div>}
                <Button variant="secondary" className="mt-3 w-full" busy={busy} onClick={markSubmitted}>I submitted it</Button>
              </div>
            </Panel>
          )}
          <Button className="w-full" onClick={() => navigate(`/s/${token}/applications`)}>View my applications</Button>
        </aside>
      </div>
    </>
  );
}

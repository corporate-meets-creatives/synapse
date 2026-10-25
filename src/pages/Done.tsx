import { useEffect, useState } from "react";
import { Badge, Button, Loading, Notice, Panel, Steps, TextField } from "../components/ui";
import { navigate } from "../lib/router";
import { api, ApiError } from "../lib/api";
import { useQuestions } from "../lib/useQuestions";
import { formatDate, providerById } from "../lib/catalog";
import { APPLY_STEPS } from "../lib/steps";
import { useApplication } from "../lib/useApplication";
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
  useEffect(() => { if (app?.status === "draft") navigate(`/s/${token}/apply/${id}/review`, true); }, [app, token, id]);

  if (error) return <NotFoundLink />;
  if (!app || app.status === "draft" || loading) return <Loading label="Loading your application" />;

  const provider = providerById(app.providerId);
  const submitted = app.status === "submitted_owner_reported";
  const answers = questions.filter((q) => !q.ownerOnly).map((q) => ({ q, f: app.fields.find((x) => x.questionId === q.id) })).filter((x) => x.f && x.f.answer.trim());
  const portal = form?.portalUrl ?? provider?.applicationUrl;
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
        </Panel>
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {!submitted && (
            <Panel>
              <h2 className="text-xl">Submit on their site</h2>
              <a href={portal ?? undefined} target="_blank" rel="noreferrer"
                className="mt-4 flex w-full items-center justify-center rounded-full bg-ocean px-5 py-2.5 font-semibold text-white no-underline hover:bg-ocean-deep">
                Open {provider?.name ?? "vendor"} portal
              </a>
              <p className="mt-3 text-sm text-muted">Opens in a new tab. You submit the application there; Wellyfish doesn't submit it for you. Come back here once you've sent it.</p>
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

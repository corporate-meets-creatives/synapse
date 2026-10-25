import { useState } from "react";
import { Button, Loading, Notice, Panel, Steps } from "../components/ui";
import { navigate } from "../lib/router";
import { Link } from "../components/Link";
import { api, ApiError } from "../lib/api";
import { useQuestions } from "../lib/useQuestions";
import { providerById } from "../lib/catalog";
import { APPLY_STEPS } from "../lib/steps";
import { useApplication } from "../lib/useApplication";
import ProvenanceBadge from "../components/ProvenanceBadge";
import { NotFoundLink } from "./NotFound";

export default function Review({ token, id }: { token: string; id: string }) {
  const { app, error } = useApplication(token, id);
  const { questions, form, loading } = useQuestions(app);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<string | null>(null);
  if (error) return <NotFoundLink />;
  if (!app || loading) return <Loading label="Loading your application" />;
  const byId = new Map(questions.map((q) => [q.id, q]));
  const ownerOnly = questions.filter((q) => q.ownerOnly);

  const provider = providerById(app.providerId);
  const missing = app.fields.filter((f) => f.needsInput);
  const edit = (qid: string) => navigate(`/s/${token}/apply/${id}#q-${qid}`);

  async function approve() {
    setBusy(true);
    setFail(null);
    try {
      await api.approveApplication(token, id, app!.version);
      navigate(`/s/${token}/apply/${id}/done`);
    } catch (e) {
      setFail(e instanceof ApiError ? e.message : "We couldn't approve these answers.");
      setBusy(false);
    }
  }

  return (
    <>
      <Steps steps={APPLY_STEPS} current={1} />
      <div className="mb-6 max-w-2xl">
        <h1 className="text-3xl sm:text-4xl">Review what will be shared</h1>
        <p className="mt-2 text-lg text-muted">
          Going to <strong>{provider?.name ?? app.providerId}</strong> as a {provider?.applicantType === "instructor" ? "instructor application" : "studio partnership application"}.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Panel>
          <dl className="divide-y divide-mist">
            {questions.filter((q) => !q.ownerOnly).map((q) => {
              const f = app.fields.find((x) => x.questionId === q.id);
              if (!f) return null;
              return (
                <div key={q.id} className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr_auto] sm:gap-4">
                  <dt className="font-semibold">{q.label}</dt>
                  <dd className="whitespace-pre-wrap">
                    {f.answer || <span className="text-muted">No answer yet</span>}
                    <div className="mt-1"><ProvenanceBadge field={f} /></div>
                  </dd>
                  <dd><Button variant="quiet" onClick={() => edit(q.id)}>Edit</Button></dd>
                </div>
              );
            })}
          </dl>
        </Panel>
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Panel>
            <h2 className="text-xl">Before you continue</h2>
            {missing.length > 0 ? (
              <div className="mt-3">
                <Notice tone="coral" title={`${missing.length} answer${missing.length === 1 ? "" : "s"} still need your input`}>
                  <ul className="mt-1 list-disc pl-5">
                    {missing.map((f) => <li key={f.questionId}><button className="underline" onClick={() => edit(f.questionId)}>{byId.get(f.questionId)?.label ?? f.questionId}</button></li>)}
                  </ul>
                </Notice>
              </div>
            ) : (
              <p className="mt-2 text-sm">Every answer is filled in. Attachments: none. Documents come later, during onboarding.</p>
            )}
            {ownerOnly.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-semibold">You'll complete these on the vendor's portal yourself:</p>
                <ul className="mt-1 list-disc pl-5 text-sm text-muted">{ownerOnly.map((q) => <li key={q.id}>{q.label}</li>)}</ul>
              </div>
            )}
            {form?.isDemo && <p className="mt-3 text-sm font-medium text-[#5a3fc0]">Example form: these questions are placeholders, not the vendor's real application.</p>}
            <p className="mt-4 text-sm text-muted">
              {provider?.name ?? "The provider"} may ask you to accept terms or sign declarations on their website. We never accept those for you.
            </p>
            {fail && <div className="mt-4"><Notice tone="coral" title={fail} /></div>}
            <Button className="mt-5 w-full" busy={busy} disabled={missing.length > 0} onClick={approve}>Approve these answers</Button>
            <Link to={`/s/${token}/apply/${id}`} className="mt-3 block text-center text-sm font-semibold text-ocean">Back to editing</Link>
          </Panel>
        </aside>
      </div>
    </>
  );
}

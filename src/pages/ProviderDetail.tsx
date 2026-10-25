import { useEffect, useState } from "react";
import { Badge, Button, Loading, Notice, Panel } from "../components/ui";
import { navigate } from "../lib/router";
import { Link } from "../components/Link";
import { api, ApiError, type MatchEntry, type RequirementResult } from "../lib/api";
import { useStudio, matchCache } from "../lib/session";
import { fitOf, linkStatus } from "../lib/labels";
import { formatDate, providerById } from "../lib/catalog";
import { FORM_VERSION, prefill } from "../lib/forms";
import { NotFoundLink } from "./NotFound";
import { savedFormAnswers } from "../features/questions/store";

const icon = { met: "✓", not_met: "✕", unknown: "?" } as const;
const iconTone = { met: "bg-lagoon text-white", not_met: "bg-coral text-white", unknown: "bg-jelly-soft text-[#5a3fc0]" } as const;

function ReqList({ items, empty }: { items: RequirementResult[]; empty: string }) {
  if (!items.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((r) => (
        <li key={r.requirementId} className="flex gap-3">
          <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${iconTone[r.result]}`} aria-hidden="true">{icon[r.result]}</span>
          <span>
            {r.label}
            <span className="sr-only"> — {r.result === "met" ? "met" : r.result === "not_met" ? "not met" : "not answered yet"}</span>
            {r.source && <a href={r.source.url} target="_blank" rel="noreferrer" className="ml-2 text-sm text-ocean underline">source</a>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function ProviderDetail({ token, providerId }: { token: string; providerId: string }) {
  const { studio, error } = useStudio(token);
  const instructorId = new URLSearchParams(window.location.search).get("i");
  const [fetched, setFetched] = useState<MatchEntry[] | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<string | null>(null);

  const cached = matchCache.get(token);
  useEffect(() => {
    if (!studio || cached) return;
    let live = true;
    api.match(studio)
      .then((r) => { matchCache.set(token, r.matches); if (live) setFetched(r.matches); })
      .catch(() => { if (live) setFetched(null); });
    return () => { live = false; };
  }, [studio, token, cached]);
  const list = cached ?? fetched;
  const entry = list === undefined ? undefined
    : (list ?? []).find((m) => m.providerId === providerId && (m.instructorId ?? null) === (instructorId ?? null)) ?? null;

  if (error) return <NotFoundLink />;
  if (!studio || entry === undefined) return <Loading label="Loading provider" />;
  if (!entry) return <Notice tone="coral" title="We couldn't find this provider in your results."><Link to={`/s/${token}/results`} className="text-ocean underline">Back to results</Link></Notice>;

  const cat = providerById(providerId);
  const fit = fitOf(entry);
  const link = linkStatus(entry);
  const external = entry.workflowMode === "external_link";
  const app = entry.requirementResults.filter((r) => r.stage === "application");
  const later = entry.requirementResults.filter((r) => r.stage !== "application");
  const who = entry.instructorId ? studio.instructors.find((i) => i.id === entry.instructorId)?.name : null;

  async function prepare() {
    setBusy(true);
    setFail(null);
    try {
      // Use the provider's real form when we have one: Claude drafts narrative answers, facts come from the
      // confirmed profile and the follow-up questions, and unknown facts stay blank. Fall back to the basic form.
      let formVersion = FORM_VERSION;
      let fields = prefill(studio!);
      try {
        const known = savedFormAnswers.get(token, providerId).map((a) => ({ questionId: a.questionId, answer: a.answer, provenance: "owner_edited" as const, needsInput: false }));
        const d = await api.draft(studio!, providerId, entry!.instructorId, known);
        formVersion = d.formVersion;
        fields = d.answers;
      } catch { /* no form for this provider: keep the basic form */ }
      const { application } = await api.createApplication(token, {
        providerId, instructorId: entry!.instructorId, formVersion, fields,
      });
      navigate(`/s/${token}/apply/${application.id}`);
    } catch (e) {
      setFail(e instanceof ApiError ? e.message : "We couldn't start the application.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link to={`/s/${token}/results`} className="text-sm font-semibold text-ocean">Back to results</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-4xl">{entry.providerName}</h1>
          {who && <p className="mt-1 text-muted">Application for {who}</p>}
          <p className="mt-3 text-lg">{cat?.summary}</p>
        </div>
        <Badge tone={fit.tone}>{fit.text}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel>
            <h2 className="text-xl">How they can help</h2>
            <p className="mt-2">{entry.explanation}</p>
          </Panel>
          {entry.missingToApply.length > 0 && (
            <Panel>
              <h2 className="text-xl">Information still needed to apply</h2>
              <ul className="mt-3 list-disc space-y-1 pl-5">{entry.missingToApply.map((m) => <li key={m}>{m}</li>)}</ul>
              <p className="mt-3 text-sm text-muted">Items we don't know yet are not counted against you.</p>
            </Panel>
          )}
          <Panel>
            <h2 className="text-xl">Fit assessment</h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-3">
              <div><h3 className="mb-2 text-base">Met</h3><ReqList items={app.filter((r) => r.result === "met")} empty="None confirmed yet." /></div>
              <div><h3 className="mb-2 text-base">Blockers</h3><ReqList items={app.filter((r) => r.result === "not_met")} empty="No blockers found." /></div>
              <div><h3 className="mb-2 text-base">Unanswered</h3><ReqList items={app.filter((r) => r.result === "unknown")} empty="Nothing left to answer." /></div>
            </div>
            {(app.some((r) => r.result === "unknown") || entry.instructorRequired) && (
              <p className="mt-4 text-sm text-muted">
                <Link to={`/s/${token}/providers/${providerId}/questions${instructorId ? `?i=${encodeURIComponent(instructorId)}` : ""}`} className="font-semibold text-ocean underline">
                  Answer the few follow-up questions
                </Link>{" "}to update the fit. You can also edit your <Link to={`/s/${token}/profile`} className="text-ocean underline">business profile</Link>.
              </p>
            )}
          </Panel>
          <Panel>
            <h2 className="text-xl">After you're accepted</h2>
            <p className="mb-3 mt-1 text-sm text-muted">These don't block your application. You'll finish them during onboarding.</p>
            <ReqList items={later} empty="Nothing listed for onboarding." />
          </Panel>
        </div>

        <aside className="space-y-6">
          {external ? (
            <Panel>
              <h2 className="text-xl">Apply on {entry.providerName}'s site</h2>
              <p className="mt-2 text-sm text-muted">
                We can't confirm eligibility, acceptance or availability. You apply directly with {entry.providerName}, and we don't prepare or submit anything for you.
              </p>
              {entry.externalUrl && (
                <a href={entry.externalUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ocean px-5 py-2.5 font-semibold text-white hover:bg-ocean-deep">
                  Apply on their site<span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
              <div className="mt-3"><Badge tone={link.tone}>{link.text}</Badge></div>
            </Panel>
          ) : (
            <Panel>
              <h2 className="text-xl">Process</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>We prepare your answers from your confirmed profile.</li>
                <li>You review and approve every answer.</li>
                <li>You finish on {entry.providerName}'s website. We never submit for you.</li>
              </ol>
              {fail && <div className="mt-4"><Notice tone="coral" title={fail} /></div>}
              {entry.instructorRequired ? (
                <>
                  <p className="mt-4 text-sm text-muted">This program applies to one instructor at a time. Choose or add the instructor first.</p>
                  <Button className="mt-3 w-full" onClick={() => navigate(`/s/${token}/providers/${providerId}/questions`)}>Choose or add the instructor</Button>
                </>
              ) : (
                <Button className="mt-5 w-full" busy={busy} onClick={prepare}>Prepare application</Button>
              )}
            </Panel>
          )}
          <Panel>
            <h2 className="text-xl">Evidence</h2>
            <p className="mt-1 text-sm text-muted">
              Last checked {formatDate(entry.lastChecked)}.{!entry.requirementsVerified && " Requirements come from public sources and haven't been confirmed with the provider."}
            </p>
            {entry.linkEvidence && (
              <p className="mt-2 text-sm"><Badge tone={link.tone}>{link.text}</Badge> <span className="text-muted">{entry.linkEvidence.note}</span></p>
            )}
            <p className="mt-3 text-sm">
              <a href={entry.applicationUrl} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-ocean underline">Official page: {new URL(entry.applicationUrl).hostname.replace(/^www\./, "")}</a>
            </p>
            <p className="mt-3 text-sm font-semibold">Sources</p>
            <ul className="mt-1 space-y-1.5 text-sm">
              {entry.sources.map((s) => (
                <li key={s}><a href={s} target="_blank" rel="noreferrer" className="break-all text-ocean underline">{new URL(s).hostname.replace(/^www\./, "")}{new URL(s).pathname}</a></li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

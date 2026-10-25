import { useEffect, useState } from "react";
import { Badge, Button, Loading, Notice, PageTitle, Panel, Progress, Steps } from "../components/ui";
import { INTAKE_STEPS } from "../lib/steps";
import { navigate } from "../lib/router";
import { Link } from "../components/Link";
import { api, ApiError, type MatchEntry } from "../lib/api";
import { useStudio, matchCache } from "../lib/session";
import { savedNeed } from "../lib/local";
import { fitOf, FIT_TEXTS, linkStatus, type FitText } from "../lib/labels";
import { formatDate, providerById } from "../lib/catalog";
import { NotFoundLink } from "./NotFound";

const STAGES = ["Finding providers", "Checking service areas", "Comparing requirements"];
const strip = { lagoon: "bg-lagoon", jelly: "bg-jelly", coral: "bg-coral" } as const;

const instructorName = (m: MatchEntry, names: Record<string, string>) => (m.instructorId ? names[m.instructorId] : null);

export default function Results({ token }: { token: string }) {
  const { studio, error } = useStudio(token);
  const [matches, setMatches] = useState<MatchEntry[] | null>(() => matchCache.get(token) ?? null);
  const [stage, setStage] = useState(0);
  const [fail, setFail] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | FitText>("all");
  const need = savedNeed.get(token);

  useEffect(() => {
    if (!studio || matches) return;
    let live = true;
    const t = [setTimeout(() => setStage(1), 1200), setTimeout(() => setStage(2), 2600)];
    api.match(studio)
      .then((r) => { if (live) { matchCache.set(token, r.matches); setMatches(r.matches); } })
      .catch((e) => { if (live) setFail(e instanceof ApiError ? e.message : "We couldn't compare providers."); })
      .finally(() => t.forEach(clearTimeout));
    return () => { live = false; t.forEach(clearTimeout); };
  }, [studio, matches, token]);

  if (error) return <NotFoundLink />;
  if (!studio) return <Loading label="Loading your profile" />;

  const names = Object.fromEntries(studio.instructors.map((i) => [i.id, i.name]));
  const shown = (matches ?? []).filter((m) => filter === "all" || fitOf(m).text === filter);

  return (
    <>
      <Steps steps={INTAKE_STEPS} current={3} />
      <PageTitle sub={
        <>Near {studio.profile.city}, {studio.profile.state}{need?.category ? ` · ${need.category.toLowerCase()}` : ""}.{" "}
          <Link to={`/s/${token}/need`} className="font-semibold text-ocean">Change</Link></>
      }>
        Providers matching your business needs
      </PageTitle>

      {fail && <Notice tone="coral" title={fail}><Button variant="quiet" onClick={() => { setFail(null); setMatches(null); }}>Try again</Button></Notice>}

      {!matches && !fail && (
        <Panel className="max-w-xl"><Progress stages={STAGES} active={stage} /></Panel>
      )}

      {matches && (
        <>
          <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by fit">
            {(["all", ...FIT_TEXTS] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${filter === f ? "border-ink bg-ink text-white" : "border-mist bg-surface text-muted hover:text-ink"}`}>
                {f === "all" ? `All (${matches.length})` : `${f} (${matches.filter((m) => fitOf(m).text === f).length})`}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <Notice title="No providers match these filters">
              Every provider we track is shown under “All”. Try another filter, or update your profile so we can check more requirements.
            </Notice>
          ) : (
            <ul className="space-y-4">
              {shown.map((m) => {
                const fit = fitOf(m);
                const link = linkStatus(m);
                const external = m.workflowMode === "external_link";
                const gaps = m.missingToApply;
                const cat = providerById(m.providerId);
                const who = instructorName(m, names);
                const known = m.requirementResults.filter((r) => r.stage === "application");
                return (
                  <li key={`${m.providerId}-${m.instructorId ?? "studio"}`}>
                    <article className="relative overflow-hidden rounded-panel border border-mist bg-surface p-5 pl-7 sm:p-6 sm:pl-8">
                      <span className={`absolute inset-y-0 left-0 w-2 ${strip[fit.tone]}`} aria-hidden="true" />
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-2xl">{m.providerName}</h2>
                          <p className="text-sm text-muted">
                            {cat?.applicantType === "instructor" ? `Instructor program${who ? ` · for ${who}` : ""}` : "Studio partnership"}
                          </p>
                        </div>
                        <Badge tone={fit.tone}>{fit.text}</Badge>
                      </div>
                      <p className="mt-3 max-w-2xl">{m.explanation}</p>
                      {gaps.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-semibold">Still needed to apply</p>
                          <ul className="mt-1.5 flex flex-wrap gap-2">
                            {gaps.slice(0, 4).map((g) => <li key={g}><Badge tone="ocean">{g}</Badge></li>)}
                            {gaps.length > 4 && <li className="self-center text-sm text-muted">+{gaps.length - 4} more</li>}
                          </ul>
                        </div>
                      )}
                      <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                        <div><dt className="text-muted">Known requirements</dt><dd className="font-medium">{known.filter((r) => r.result === "met").length} of {known.length} met</dd></div>
                        <div><dt className="text-muted">Fees</dt><dd className="font-medium">Not confirmed</dd></div>
                        <div><dt className="text-muted">Last checked</dt><dd className="font-medium">{formatDate(m.lastChecked)}{!m.requirementsVerified && " · not yet verified"}</dd></div>
                      </dl>
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <Button onClick={() => navigate(`/s/${token}/providers/${m.providerId}${m.instructorId ? `?i=${m.instructorId}` : ""}`)}>
                          View provider
                        </Button>
                        {m.instructorRequired && (
                          <Button variant="secondary" onClick={() => navigate(`/s/${token}/providers/${m.providerId}/questions`)}>Choose or add the instructor</Button>
                        )}
                        {external && m.externalUrl && (
                          <a href={m.externalUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border-2 border-ocean bg-surface px-5 py-2.5 font-semibold text-ocean hover:bg-foam">
                            Apply on their site<span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        )}
                        <Badge tone={link.tone}>{link.text}</Badge>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-6 text-sm text-muted">
            We haven't confirmed availability or acceptance with any provider. Each card shows what we could check from public sources.
          </p>
        </>
      )}
    </>
  );
}

import { useCallback, useEffect, useState } from "react";
import type { InstructorInput } from "../../../shared/schemas";
import { Badge, Button, Loading, Notice, PageTitle, Panel } from "../../components/ui";
import { Link } from "../../components/Link";
import { api, ApiError, type AnswerIn, type QuestionsResponse, type QuestionsInstructor } from "../../lib/api";
import { navigate } from "../../lib/router";
import { matchCache, useStudio } from "../../lib/session";
import { NotFoundLink } from "../../pages/NotFound";
import InstructorPicker from "./InstructorPicker";
import QuestionField from "./QuestionField";
import { display, specForConfirmed } from "./helpers";
import { savedFormAnswers } from "./store";

type Pending = Record<string, AnswerIn["value"]>;
const tone = { "Potential fit": "lagoon", "More information needed": "jelly", "Known requirement not met": "coral" } as const;
const basisText = { extracted: "Read from your website", owner_reported: "Entered by you", owner_confirmed: "Confirmed by you" } as const;

// The API takes yes/no only for requirement answers, so keep just those when saving an instructor.
const toInstructorInput = (i: QuestionsInstructor): InstructorInput => ({
  ...(/^[0-9a-f-]{36}$/i.test(i.id) ? { id: i.id } : {}),
  name: i.name || "Instructor",
  cprCertified: i.cprCertified,
  certifications: i.certifications,
  requirementAnswers: Object.fromEntries(Object.entries(i.requirementAnswers).filter(([, v]) => typeof v === "boolean")) as Record<string, boolean>,
});

export default function Questions({ token, providerId }: { token: string; providerId: string }) {
  const { studio, error, setStudio } = useStudio(token);
  const [instructorId, setInstructorId] = useState<string | null>(() => new URLSearchParams(window.location.search).get("i"));
  const [pending, setPending] = useState<Pending>({});
  const [editing, setEditing] = useState<Set<string>>(new Set());
  const [res, setRes] = useState<QuestionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = Object.keys(pending).length > 0;
  const msg = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);
  const toAnswers = (p: Pending): AnswerIn[] => Object.entries(p).filter(([, v]) => v !== undefined).map(([field, value]) => ({ field, value: value as AnswerIn["value"] }));

  const run = useCallback(async (p: Pending, iid: string | null) => {
    if (!studio) return null;
    return api.questions(studio, { providerId, instructorId: iid ?? undefined, answers: toAnswers(p), existingAnswers: savedFormAnswers.get(token, providerId) });
  }, [studio, providerId, token]);

  // Load the questions once the studio is known, and whenever the chosen instructor changes.
  useEffect(() => {
    if (!studio) return;
    let live = true;
    Promise.resolve()
      .then(() => { if (live) { setLoading(true); setFail(null); } return run({}, instructorId); })
      .then((r) => { if (live && r) setRes(r); })
      .catch((e) => { if (live) setFail(msg(e, "We couldn't load your questions.")); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studio, instructorId]);

  // Warn before leaving with answers that aren't saved.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setAnswer = (field: string, v: AnswerIn["value"] | undefined) => {
    setSaved(false);
    setPending((p) => {
      const n = { ...p };
      if (v === undefined) delete n[field]; else n[field] = v;
      return n;
    });
  };

  const choose = (id: string | null) => {
    setPending({});
    setInstructorId(id);
    window.history.replaceState(null, "", id ? `${window.location.pathname}?i=${encodeURIComponent(id)}` : window.location.pathname);
  };

  async function addInstructor(name: string) {
    if (!studio) return;
    setBusy(true);
    setFail(null);
    try {
      const before = new Set(studio.instructors.map((i) => i.id));
      const existing: InstructorInput[] = studio.instructors.map((i) => ({ id: i.id, name: i.name, cprCertified: i.cprCertified, certifications: i.certifications, requirementAnswers: i.requirementAnswers ?? {} }));
      const { studio: updated } = await api.updateStudio(token, studio.profile, [...existing, { name, certifications: [], requirementAnswers: {} }]);
      matchCache.clear(token);
      setStudio(updated);
      const created = updated.instructors.find((i) => !before.has(i.id));
      if (created) choose(created.id);
    } catch (e) {
      setFail(msg(e, "We couldn't add that instructor."));
    } finally {
      setBusy(false);
    }
  }

  async function check() {
    setBusy(true);
    setFail(null);
    try {
      const r = await run(pending, instructorId);
      if (r) setRes(r);
    } catch (e) {
      setFail(msg(e, "We couldn't update your fit. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!studio) return;
    setBusy(true);
    setFail(null);
    try {
      const r = await run(pending, instructorId);
      if (!r) return;
      const { studio: updated } = await api.updateStudio(token, r.studio, r.instructors.map(toInstructorInput));
      const kept = new Map(savedFormAnswers.get(token, providerId).map((a) => [a.questionId, a.answer]));
      r.existingAnswers.forEach((a) => kept.set(a.questionId, a.answer));
      savedFormAnswers.set(token, providerId, [...kept].map(([questionId, answer]) => ({ questionId, answer })));
      matchCache.clear(token);
      setStudio(updated); // reloads the questions with the saved data
      setPending({});
      setEditing(new Set());
      setSaved(true);
    } catch (e) {
      setFail(msg(e, "We couldn't save your answers. Your changes are still here; try again."));
    } finally {
      setBusy(false);
    }
  }

  if (error) return <NotFoundLink />;
  if (!studio || (!res && !fail)) return <Loading label="Loading your questions" />;
  if (!res) return <Notice tone="coral" title={fail ?? "Something went wrong."}><Button className="mt-3" onClick={() => window.location.reload()}>Try again</Button></Notice>;

  const back = `/s/${token}/providers/${providerId}${instructorId ? `?i=${encodeURIComponent(instructorId)}` : ""}`;
  const needPick = res.instructorSelection.required && !res.instructorSelection.selectedId;
  const chosenName = res.instructors.find((i) => i.id === res.instructorSelection.selectedId)?.name;

  return (
    <div className="space-y-6">
      <Link to={back} className="text-sm font-semibold text-ocean">Back to {res.providerName}</Link>
      <PageTitle sub={`Only what we still need to prepare your ${res.providerName} application. Answer what you know; "I don't know" is fine and is never counted against you.`}>
        A few quick questions
      </PageTitle>

      {needPick ? (
        <InstructorPicker options={res.instructorSelection.options} busy={busy || loading} error={fail ?? undefined} onSelect={choose} onAdd={addInstructor} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-6">
            {fail && <Notice tone="coral" title={fail} />}
            {saved && !dirty && <Notice tone="lagoon" title="Saved. Your business profile is up to date." />}
            {res.form?.isDemo && <Notice tone="jelly" title="Demo form">These questions come from a placeholder form, not the real {res.providerName} application. They will change once the real form is confirmed.</Notice>}
            {res.instructorSelection.required && (
              <p className="text-sm text-muted">
                Application for <strong>{chosenName}</strong>.{" "}
                <button type="button" className="text-ocean underline" onClick={() => choose(null)}>Change instructor</button>
              </p>
            )}

            {loading && <Loading label="Updating" />}

            {res.questions.length === 0 ? (
              <Notice tone="lagoon" title="You're all set. We have what we need.">
                <Link to={back} className="font-semibold text-ocean underline">Back to {res.providerName}</Link> to {res.readiness && res.readiness.fitLabel !== "Known requirement not met" ? "prepare your application" : "review your fit"}.
              </Notice>
            ) : (
              <ol className="space-y-4">
                {res.questions.map((q) => (
                  <li key={`${q.id}:${q.field}`}>
                    <Panel className="space-y-3">
                      <QuestionField spec={q} value={pending[q.field]} onChange={(v) => setAnswer(q.field, v)} />
                      <p className="text-sm text-muted"><span className="font-semibold text-ink">Why we ask:</span> {q.why}</p>
                    </Panel>
                  </li>
                ))}
              </ol>
            )}

            {res.unknownFields.length > 0 && <p className="text-sm text-muted">Marked "I don't know": {res.unknownFields.length}. We keep these as unknown and won't guess.</p>}

            {res.confirmed.length > 0 && (
              <Panel>
                <h2 className="text-xl">Already on file ({res.confirmed.length})</h2>
                <p className="mb-3 mt-1 text-sm text-muted">We won't ask these again. Correct anything that's wrong.</p>
                <ul className="divide-y divide-mist">
                  {res.confirmed.map((c) => {
                    const open = editing.has(c.field);
                    return (
                      <li key={`${c.id}:${c.field}`} className="py-3">
                        {open ? (
                          <div className="space-y-2">
                            <QuestionField spec={specForConfirmed(c)} value={pending[c.field] ?? (c.value as AnswerIn["value"])} onChange={(v) => setAnswer(c.field, v)} />
                            <Button variant="quiet" onClick={() => { setAnswer(c.field, undefined); setEditing((s) => { const n = new Set(s); n.delete(c.field); return n; }); }}>Cancel correction</Button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="font-semibold">{c.label}</p>
                              <p>{display(pending[c.field] ?? c.value)}</p>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <Badge tone={c.basis === "owner_confirmed" ? "lagoon" : "ocean"}>{basisText[c.basis]}</Badge>
                                {c.needsConfirmation && <Badge tone="jelly">Please check this</Badge>}
                                {c.result === "not_met" && <Badge tone="coral">Doesn't meet a requirement</Badge>}
                              </div>
                            </div>
                            <Button variant="secondary" onClick={() => setEditing((s) => new Set(s).add(c.field))}>Correct</Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" busy={busy} disabled={!dirty} onClick={check}>Update my fit</Button>
              <Button busy={busy} disabled={!dirty} onClick={save}>Save answers</Button>
              {dirty && <p className="text-sm font-medium text-coral-deep">You have unsaved answers.</p>}
            </div>
          </div>

          <aside>
            <Panel className="space-y-3 lg:sticky lg:top-6">
              <h2 className="text-xl">Your fit right now</h2>
              {res.readiness ? (
                <>
                  <Badge tone={tone[res.readiness.fitLabel]}>{res.readiness.fitLabel}</Badge>
                  {res.readiness.blockers.length > 0 && (
                    <div><h3 className="text-base">Doesn't meet</h3><ul className="list-disc pl-5">{res.readiness.blockers.map((b) => <li key={b}>{b}</li>)}</ul></div>
                  )}
                  {res.readiness.missingToApply.some((m) => !res.readiness!.blockers.includes(m)) || res.readiness.blockers.length === 0 && res.readiness.missingToApply.length > 0 ? (
                    <div><h3 className="text-base">Still needed</h3><ul className="list-disc pl-5">{res.readiness.missingToApply.filter((m) => !res.readiness!.blockers.includes(m)).map((m) => <li key={m}>{m}</li>)}</ul></div>
                  ) : <p>Nothing known blocks starting this application.</p>}
                  <p className="text-sm text-muted">Only {res.providerName} decides eligibility. This isn't a confirmation. {dirty && "Press “Update my fit” to see the effect of your new answers."}</p>
                </>
              ) : <p className="text-sm text-muted">Your answers go straight into the application form for {res.providerName}.</p>}
              <button type="button" className="text-sm text-ocean underline" onClick={() => navigate(back)}>Back to provider</button>
            </Panel>
          </aside>
        </div>
      )}
    </div>
  );
}

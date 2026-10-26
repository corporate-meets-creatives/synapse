import { useState, type FormEvent } from "react";
import type { InstructorInput, StudioProfileInput } from "../../shared/schemas";
import { Badge, Button, Notice, Panel, TextArea, TextField } from "./ui";
import { INSTRUCTOR_QUESTIONS } from "../lib/labels";
import ClassTypePicker from "../features/profile/ClassTypePicker";

type Meta = StudioProfileInput["fieldMeta"];
export type ProfileDraft = Partial<StudioProfileInput> & { fieldMeta?: Meta };

type TextKey = "name" | "website" | "address" | "zip" | "city" | "state" | "contactName" | "email" | "phone" | "description" | "legalStructure";
const REQUIRED: TextKey[] = ["name", "address", "city", "state", "contactName", "email", "phone", "description"];

const yesNo = (v: boolean | undefined) => (v === true ? "yes" : v === false ? "no" : "");
const fromYesNo = (v: string) => (v === "yes" ? true : v === "no" ? false : undefined);

function TriState({ id, label, value, onChange }: { id: string; label: string; value: boolean | undefined; onChange: (v: boolean | undefined) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-1.5">
      <label htmlFor={id} className="text-sm">{label}</label>
      <select id={id} value={yesNo(value)} onChange={(e) => onChange(fromYesNo(e.target.value))}
        className="rounded-field border border-mist bg-surface px-2.5 py-1.5 text-sm">
        <option value="">Not sure</option><option value="yes">Yes</option><option value="no">No</option>
      </select>
    </div>
  );
}

export default function ProfileForm({
  initial, initialInstructors, missingFields = [], submitLabel, onSubmit,
}: {
  initial: ProfileDraft; initialInstructors: InstructorInput[]; missingFields?: string[];
  submitLabel: string; onSubmit: (p: StudioProfileInput, i: InstructorInput[]) => Promise<void>;
}) {
  const [p, setP] = useState<ProfileDraft>({ danceStyles: [], classTypes: [], fieldMeta: {}, ...initial });
  const [instructors, setInstructors] = useState<InstructorInput[]>(initialInstructors);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);

  const meta = p.fieldMeta ?? {};
  const setText = (k: TextKey, v: string) =>
    setP((cur) => ({
      ...cur,
      [k]: v,
      fieldMeta: cur.fieldMeta?.[k] ? { ...cur.fieldMeta, [k]: { ...cur.fieldMeta[k], provenance: "owner_edited" } } : cur.fieldMeta,
    }));

  const badge = (k: string) => {
    const m = meta[k];
    const value = (p as Record<string, unknown>)[k];
    const empty = value === undefined || value === "" || (Array.isArray(value) && !value.length);
    if (empty && (REQUIRED.includes(k as TextKey) || missingFields.includes(k))) return <Badge tone="coral">Needs your input</Badge>;
    if (m?.provenance === "ai_draft") return (
      <Badge tone="jelly">From website{m.source && <a className="ml-1 underline" href={m.source} target="_blank" rel="noreferrer">source</a>}</Badge>
    );
    return null;
  };

  const text = (k: TextKey, label: string, opts: { type?: string; long?: boolean; hint?: string; placeholder?: string } = {}) => {
    const props = {
      id: `f-${k}`, label, badge: badge(k), hint: opts.hint, placeholder: opts.placeholder,
      value: (p[k] as string | undefined) ?? "",
      error: tried && REQUIRED.includes(k) && !((p[k] as string | undefined) ?? "").trim() ? "Add this to continue." : undefined,
    };
    return opts.long
      ? <TextArea {...props} onChange={(e) => setText(k, e.target.value)} />
      : <TextField {...props} type={opts.type ?? "text"} onChange={(e) => setText(k, e.target.value)} />;
  };

  const list = (k: "danceStyles" | "classTypes", label: string, placeholder: string) => (
    <TextField id={`f-${k}`} label={label} badge={badge(k)} placeholder={placeholder} hint="Separate with commas."
      value={(p[k] ?? []).join(", ")}
      onChange={(e) => setP((cur) => ({ ...cur, [k]: e.target.value.split(",").map((s) => s.trimStart()).filter((s, i, a) => s || i === a.length - 1) }))} />
  );

  const updateInstructor = (idx: number, patch: Partial<InstructorInput>) =>
    setInstructors((cur) => cur.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    setError(null);
    if (REQUIRED.some((k) => !((p[k] as string | undefined) ?? "").trim())) {
      setError("Some details still need your input. They're marked in pink.");
      return;
    }
    if (!confirmed) { setError("Confirm that these details are accurate to continue."); return; }
    const clean = (v?: string) => (v && v.trim() ? v.trim() : undefined);
    let website = clean(p.website);
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    const fieldMeta: Meta = Object.fromEntries(Object.entries(meta).map(([k, m]) => [k, { ...m, provenance: m.provenance === "ai_draft" ? "owner_confirmed" : m.provenance }]));
    const profile: StudioProfileInput = {
      name: p.name!.trim(), website, address: clean(p.address), zip: clean(p.zip), city: p.city!.trim(), state: p.state!.trim(),
      phone: clean(p.phone), email: clean(p.email), contactName: clean(p.contactName), description: clean(p.description),
      legalStructure: clean(p.legalStructure), yearsOperating: p.yearsOperating, employeeCount: p.employeeCount,
      danceStyles: (p.danceStyles ?? []).map((s) => s.trim()).filter(Boolean),
      classTypes: (p.classTypes ?? []).map((s) => s.trim()).filter(Boolean),
      schedulingPlatform: clean(p.schedulingPlatform), hasLiabilityInsurance: p.hasLiabilityInsurance,
      googleBusinessProfileVerified: p.googleBusinessProfileVerified, hasPriceList: p.hasPriceList, fieldMeta,
    };
    setBusy(true);
    try {
      await onSubmit(profile, instructors.filter((i) => i.name.trim()).map((i) => ({ ...i, name: i.name.trim() })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save your profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_20rem]" noValidate>
      <div className="space-y-6">
        <Panel>
          <h2 className="mb-4 text-xl">Business</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{text("name", "Business name")}</div>
            <div className="sm:col-span-2">{text("website", "Website", { placeholder: "yourstudio.com" })}</div>
            <div className="sm:col-span-2">{list("danceStyles", "Dance styles", "Ballroom, Latin, Ballet")}</div>
            <div className="sm:col-span-2">
              <ClassTypePicker value={p.classTypes ?? []} badge={badge("classTypes")}
                onChange={(next) => setP((cur) => ({
                  ...cur, classTypes: next,
                  fieldMeta: cur.fieldMeta?.classTypes ? { ...cur.fieldMeta, classTypes: { ...cur.fieldMeta.classTypes, provenance: "owner_edited" } } : cur.fieldMeta,
                }))} />
            </div>
            <div className="sm:col-span-2">{text("address", "Street address")}</div>
            {text("city", "City")}
            <div className="grid grid-cols-2 gap-4">{text("state", "State")}{text("zip", "ZIP code")}</div>
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-4 text-xl">Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {text("contactName", "Contact name")}
            {text("email", "Contact email", { type: "email" })}
            {text("phone", "Business phone", { type: "tel" })}
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-4 text-xl">About your studio</h2>
          {text("description", "Brief business description", { long: true, hint: "Two or three sentences providers will read first." })}
          <details className="mt-5">
            <summary className="cursor-pointer font-semibold text-ocean">More details some providers ask for</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {text("legalStructure", "Legal structure", { placeholder: "LLC, nonprofit…" })}
              <TextField id="f-years" label="Years operating" type="number" min={0} value={p.yearsOperating ?? ""}
                onChange={(e) => setP((c) => ({ ...c, yearsOperating: e.target.value === "" ? undefined : Number(e.target.value) }))} />
              <TextField id="f-emp" label="Employees" type="number" min={0} value={p.employeeCount ?? ""}
                onChange={(e) => setP((c) => ({ ...c, employeeCount: e.target.value === "" ? undefined : Number(e.target.value) }))} />
            </div>
          </details>
        </Panel>
        <Panel>
          <h2 className="text-xl">Instructors</h2>
          <p className="mb-4 text-sm text-muted">Some programs accept each instructor separately. Answer what you know; leave the rest as “Not sure”.</p>
          <div className="space-y-4">
            {instructors.map((ins, idx) => (
              <div key={ins.id ?? idx} className="rounded-field border border-mist p-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <TextField id={`ins-${idx}`} label="Instructor name" value={ins.name}
                      onChange={(e) => updateInstructor(idx, { name: e.target.value })} />
                  </div>
                  <Button type="button" variant="quiet" onClick={() => setInstructors((c) => c.filter((_, i) => i !== idx))}>Remove</Button>
                </div>
                <div className="mt-3 divide-y divide-mist">
                  <TriState id={`ins-${idx}-cpr`} label="Current CPR certification" value={ins.cprCertified}
                    onChange={(v) => updateInstructor(idx, { cprCertified: v })} />
                  {INSTRUCTOR_QUESTIONS.map((q) => (
                    <TriState key={q.key} id={`ins-${idx}-${q.key}`} label={q.label} value={ins.requirementAnswers?.[q.key]}
                      onChange={(v) => {
                        const ans = { ...(ins.requirementAnswers ?? {}) };
                        if (v === undefined) delete ans[q.key]; else ans[q.key] = v;
                        updateInstructor(idx, { requirementAnswers: ans });
                      }} />
                  ))}
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary"
              onClick={() => setInstructors((c) => [...c, { name: "", certifications: [], requirementAnswers: {} }])}>
              Add instructor
            </Button>
          </div>
        </Panel>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Panel>
          <h2 className="text-xl">Studio checks</h2>
          <div className="mt-2 divide-y divide-mist">
            <TriState id="s-ins" label="Liability insurance" value={p.hasLiabilityInsurance} onChange={(v) => setP((c) => ({ ...c, hasLiabilityInsurance: v }))} />
            <TriState id="s-price" label="Public price list" value={p.hasPriceList} onChange={(v) => setP((c) => ({ ...c, hasPriceList: v }))} />
            <TriState id="s-gbp" label="Verified Google Business Profile" value={p.googleBusinessProfileVerified}
              onChange={(v) => setP((c) => ({ ...c, googleBusinessProfileVerified: v }))} />
          </div>
        </Panel>
        <Panel>
          <label className="flex gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-[#2f5bea]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>I've checked these details and they're accurate.</span>
          </label>
          {error && <div className="mt-4"><Notice tone="coral" title={error} /></div>}
          <Button type="submit" busy={busy} className="mt-5 w-full">{submitLabel}</Button>
        </Panel>
      </aside>
    </form>
  );
}

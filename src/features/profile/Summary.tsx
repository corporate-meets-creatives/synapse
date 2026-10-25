import { useState, type ReactNode } from "react";
import { Badge, Button, Notice, Panel, TextArea, TextField } from "../../components/ui";
import { buildProfile, MUST_HAVE, type Draft } from "./buildProfile";
import ClassTypePicker from "./ClassTypePicker";
import type { InstructorInput, StudioProfileInput } from "../../../shared/schemas";

type TextKey = "name" | "description" | "address" | "city" | "state" | "zip" | "contactName" | "email" | "phone" | "website";
type ListKey = "danceStyles" | "classTypes";

const where = (url?: string) => {
  try { const u = new URL(url ?? ""); return u.hostname.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname); } catch { return "your page"; }
};

/** Short, attractive summary of what we learned. Edit any line in place, then confirm: no long form. */
export default function Summary({ initial, pagesRead, source, onConfirm, onEditAll }: {
  initial: Draft; pagesRead: string[]; source: "website" | "pasted";
  onConfirm: (profile: StudioProfileInput, instructors: InstructorInput[]) => Promise<void>; onEditAll: (current: Draft) => void;
}) {
  const [p, setP] = useState<Draft>({ danceStyles: [], classTypes: [], fieldMeta: {}, ...initial });
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = p.fieldMeta ?? {};

  const setText = (k: TextKey, v: string) =>
    setP((c) => ({ ...c, [k]: v, fieldMeta: { ...c.fieldMeta, [k]: { provenance: "owner_edited" } } }));
  const setList = (k: ListKey, v: string) =>
    setP((c) => ({ ...c, [k]: v.split(",").map((s) => s.trimStart()), fieldMeta: { ...c.fieldMeta, [k]: { provenance: "owner_edited" } } }));

  const from = (k: string): ReactNode => {
    const m = meta[k];
    if (m?.provenance === "owner_edited") return <Badge tone="ocean">Edited by you</Badge>;
    if (m?.provenance === "ai_draft" || m?.provenance === "owner_confirmed")
      return m.source
        ? <Badge tone="jelly">From website · <a className="underline" href={m.source} target="_blank" rel="noopener noreferrer">{where(m.source)}</a></Badge>
        : <Badge tone="jelly">{source === "pasted" ? "From your pasted text" : "From website"}</Badge>;
    return null;
  };

  const missing = (k: string) => { const v = (p as Record<string, unknown>)[k]; return v === undefined || v === "" || (Array.isArray(v) && v.every((x) => !String(x).trim())); };

  // A plain function (not a component) so inputs keep focus while typing.
  const row = ({ k, label, kind = "text", long, empty }: { k: TextKey | ListKey; label: string; kind?: "text" | "list"; long?: boolean; empty?: string }) => {
    const value = kind === "list" ? ((p[k as ListKey] ?? []).map((s) => s.trim()).filter(Boolean)) : ((p[k as TextKey] as string | undefined) ?? "");
    const isEditing = editing === k;
    return (
      <div className="py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-muted">{label}</p>
            {isEditing && k === "classTypes" ? (
              <div className="mt-2">
                <ClassTypePicker id="s-classTypes" value={p.classTypes ?? []}
                  onChange={(next) => setP((c) => ({ ...c, classTypes: next, fieldMeta: { ...c.fieldMeta, classTypes: { provenance: "owner_edited" } } }))} />
              </div>
            ) : isEditing ? (
              <div className="mt-1">
                {long
                  ? <TextArea id={`s-${k}`} label={label} autoFocus rows={4} value={p[k as TextKey] as string ?? ""} onChange={(e) => setText(k as TextKey, e.target.value)} />
                  : <TextField id={`s-${k}`} label={label} autoFocus value={kind === "list" ? (p[k as ListKey] ?? []).join(", ") : (p[k as TextKey] as string | undefined) ?? ""}
                      hint={kind === "list" ? "Separate with commas." : undefined}
                      onChange={(e) => (kind === "list" ? setList(k as ListKey, e.target.value) : setText(k as TextKey, e.target.value))} />}
              </div>
            ) : Array.isArray(value) ? (
              value.length ? <ul className="mt-1 flex flex-wrap gap-2">{value.map((v) => <li key={v}><Badge tone="ocean">{v}</Badge></li>)}</ul>
                : <p className="mt-1 text-coral-deep">{empty ?? "Not found"}. Add it</p>
            ) : value ? <p className="mt-0.5 whitespace-pre-wrap text-lg">{value}</p>
              : <p className="mt-0.5 font-medium text-coral-deep">{empty ?? "Not found on your page"}</p>}
            {!isEditing && <div className="mt-1.5">{missing(k) ? <Badge tone="coral">Needs your input</Badge> : from(k)}</div>}
          </div>
          <Button type="button" variant="quiet" onClick={() => setEditing(isEditing ? null : k)}>{isEditing ? "Done" : missing(k) ? "Add" : "Edit"}</Button>
        </div>
      </div>
    );
  };

  const tracked: (TextKey | ListKey)[] = ["name", "description", "address", "city", "state", "contactName", "email", "phone", "danceStyles", "classTypes"];
  const found = tracked.filter((k) => !missing(k)).length;
  const lacking = MUST_HAVE.filter((m) => missing(m.key));

  async function confirm() {
    setError(null);
    if (lacking.length) { setError(`Add ${lacking.map((l) => l.label.toLowerCase()).join(", ")} to continue.`); return; }
    if (!confirmed) { setError("Confirm that these details look right to continue."); return; }
    setBusy(true);
    try { await onConfirm(buildProfile(p), []); }
    catch (e) { setError(e instanceof Error ? e.message : "We couldn't save your profile. Your changes are still here; try again."); setBusy(false); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <Panel className="bg-gradient-to-br from-[#eef3ff] via-surface to-jelly-soft/40">
          <p className="text-sm font-semibold text-ocean">Here's what we found</p>
          <h2 className="mt-1 text-3xl">{p.name?.trim() || "Your business"}</h2>
          {p.category && <div className="mt-2"><Badge tone="lagoon">{p.category}</Badge></div>}
          <p className="mt-3 text-sm text-muted">
            {found} of {tracked.length} details found
            {source === "website" && pagesRead.length > 0 && <> · read {pagesRead.length} page{pagesRead.length === 1 ? "" : "s"}</>}.
            {" "}Check each line, fix anything that's off, and add what's missing.
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-mist" aria-hidden="true"><div className="h-full rounded-full bg-lagoon" style={{ width: `${(found / tracked.length) * 100}%` }} /></div>
        </Panel>

        <Panel>
          <h2 className="text-xl">About</h2>
          <div className="divide-y divide-mist">
            {row({ k: "name", label: "Business name" })}
            {row({ k: "description", label: "Description", long: true })}
            {row({ k: "danceStyles", label: "Dance styles", kind: "list", empty: "No dance styles found" })}
            {row({ k: "classTypes", label: "Services and class types", kind: "list", empty: "No services found" })}
          </div>
        </Panel>
        <Panel>
          <h2 className="text-xl">Location</h2>
          <div className="divide-y divide-mist">
            {row({ k: "address", label: "Street address" })}
            {row({ k: "city", label: "City" })}
            {row({ k: "state", label: "State" })}
          </div>
        </Panel>
        <Panel>
          <h2 className="text-xl">Contact</h2>
          <div className="divide-y divide-mist">
            {row({ k: "contactName", label: "Contact name" })}
            {row({ k: "email", label: "Email" })}
            {row({ k: "phone", label: "Phone" })}
            {row({ k: "website", label: "Website" })}
          </div>
        </Panel>
        <p className="text-sm text-muted">
          We never guess certifications, insurance or legal status from a website. You'll be asked about those only if a program needs them.
        </p>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Panel>
          <h2 className="text-xl">Ready?</h2>
          <p className="mt-1 text-sm text-muted">Nothing is saved until you confirm. You can edit everything later.</p>
          <label className="mt-4 flex gap-3">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-[#2f5bea]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>These details look right.</span>
          </label>
          {lacking.length > 0 && <p className="mt-3 text-sm font-medium text-coral-deep">Still needed: {lacking.map((l) => l.label).join(", ")}.</p>}
          {error && <div className="mt-4"><Notice tone="coral" title={error} /></div>}
          <Button type="button" busy={busy} className="mt-5 w-full" onClick={confirm}>Confirm and continue</Button>
          <Button type="button" variant="secondary" className="mt-3 w-full" onClick={() => onEditAll(p)}>Edit all details</Button>
        </Panel>
      </aside>
    </div>
  );
}

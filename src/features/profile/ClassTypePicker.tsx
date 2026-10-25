import { useState, type ReactNode } from "react";
import { CLASS_TYPE_OPTIONS } from "./classTypes";

/** Pick the services and class types you offer. Anything already saved that isn't listed stays checked, and you can add your own. */
export default function ClassTypePicker({ value, onChange, badge, id = "classTypes" }: {
  value: string[]; onChange: (next: string[]) => void; badge?: ReactNode; id?: string;
}) {
  const [other, setOther] = useState("");
  const clean = value.map((v) => v.trim()).filter(Boolean);
  const has = (o: string) => clean.some((v) => v.toLowerCase() === o.toLowerCase());
  const extras = clean.filter((v) => !CLASS_TYPE_OPTIONS.some((o) => o.toLowerCase() === v.toLowerCase()));

  const toggle = (o: string) => onChange(has(o) ? clean.filter((v) => v.toLowerCase() !== o.toLowerCase()) : [...clean, o]);
  const addOther = () => {
    const v = other.trim();
    if (v && !has(v)) onChange([...clean, v]);
    setOther("");
  };

  const pill = (checked: boolean) =>
    `flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${checked ? "border-ocean bg-foam text-ocean-deep" : "border-mist bg-surface hover:border-ocean"}`;

  return (
    <fieldset className="space-y-2.5">
      <legend className="flex flex-wrap items-center gap-2 font-semibold">Services and class types {badge}</legend>
      <div className="flex flex-wrap gap-2">
        {[...CLASS_TYPE_OPTIONS, ...extras].map((o) => (
          <label key={o} className={pill(has(o))}>
            <input type="checkbox" className="h-4 w-4 accent-[#2f5bea]" checked={has(o)} onChange={() => toggle(o)} />
            {o}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${id}-other`} className="sr-only">Add another service or class type</label>
        <input id={`${id}-other`} type="text" value={other} placeholder="Something else you offer"
          onChange={(e) => setOther(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOther(); } }}
          className="min-w-[14rem] flex-1 rounded-field border border-mist bg-surface px-3.5 py-2 text-sm placeholder:text-muted/70" />
        <button type="button" onClick={addOther} disabled={!other.trim()}
          className="rounded-full border-2 border-ocean px-4 py-1.5 text-sm font-semibold text-ocean hover:bg-foam disabled:cursor-not-allowed disabled:opacity-50">Add</button>
      </div>
      <p className="text-sm text-muted">Check everything that applies.</p>
    </fieldset>
  );
}

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

  return (
    <fieldset className="space-y-3">
      <legend className="flex flex-wrap items-center gap-2 font-semibold">Services and class types {badge}</legend>
      <p className="text-sm text-muted">Select everything you offer.</p>
      <div className="flex flex-wrap gap-2">
        {[...CLASS_TYPE_OPTIONS, ...extras].map((o) => {
          const on = has(o);
          return (
            <label key={o} className="relative cursor-pointer">
              <input type="checkbox" className="peer sr-only" checked={on} onChange={() => toggle(o)} />
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ocean peer-focus-visible:ring-offset-2 ${on ? "border-ocean bg-ocean text-white" : "border-mist bg-surface text-ink hover:border-ocean hover:bg-foam"}`}>
                {on && <span aria-hidden="true" className="text-xs">✓</span>}
                {o}
              </span>
            </label>
          );
        })}
      </div>
      <div className="flex max-w-md items-center gap-2">
        <label htmlFor={`${id}-other`} className="sr-only">Add another service or class type</label>
        <input id={`${id}-other`} type="text" value={other} placeholder="Add something else you offer"
          onChange={(e) => setOther(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOther(); } }}
          className="min-w-0 flex-1 rounded-field border border-mist bg-surface px-3.5 py-2 text-sm placeholder:text-muted/70" />
        <button type="button" onClick={addOther} disabled={!other.trim()}
          className="shrink-0 rounded-full border-2 border-ocean px-4 py-1.5 text-sm font-semibold text-ocean hover:bg-foam disabled:cursor-not-allowed disabled:border-mist disabled:text-muted disabled:hover:bg-transparent">Add</button>
      </div>
    </fieldset>
  );
}

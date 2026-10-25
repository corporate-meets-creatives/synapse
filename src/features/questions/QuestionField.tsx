import { Select, TextField } from "../../components/ui";
import type { AnswerIn } from "../../lib/api";

type Value = AnswerIn["value"] | undefined;
import type { FieldSpec } from "./helpers";

/** One answer control. "I don't know" is a real answer: it is kept as unknown, never turned into No. */
export default function QuestionField({ spec, value, onChange }: { spec: FieldSpec; value: Value; onChange: (v: Value) => void }) {
  const id = `q-${spec.id}-${spec.field}`.replace(/[^A-Za-z0-9_-]/g, "_");

  if (spec.type === "yes_no") {
    const current = value === true ? "yes" : value === false ? "no" : value === null ? "unknown" : "";
    const set = (v: string) => onChange(v === "yes" ? true : v === "no" ? false : null);
    return (
      <fieldset className="space-y-2">
        <legend className="font-semibold">{spec.label}</legend>
        <div className="flex flex-wrap gap-3">
          {[["yes", "Yes"], ["no", "No"], ["unknown", "I don't know"]].map(([v, text]) => (
            <label key={v} className={`flex cursor-pointer items-center gap-2 rounded-field border px-3.5 py-2 ${current === v ? "border-ocean bg-foam font-semibold" : "border-mist bg-surface"}`}>
              <input type="radio" name={id} value={v} checked={current === v} onChange={() => set(v)} className="accent-[var(--color-ocean)]" />
              {text}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (spec.type === "choice" && spec.options) {
    return (
      <Select id={id} label={spec.label} value={typeof value === "string" ? value : value === null ? "__unknown" : ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value === "__unknown" ? null : e.target.value)}>
        <option value="">Choose…</option>
        {spec.options.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value="__unknown">I don't know yet</option>
      </Select>
    );
  }

  const asText = Array.isArray(value) ? value.join(", ") : typeof value === "string" || typeof value === "number" ? String(value) : "";
  return (
    <TextField id={id} label={spec.label} type={spec.type === "number" ? "number" : "text"} value={asText}
      hint={spec.hint ?? (spec.type === "list" ? "Separate items with commas." : undefined)}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)} />
  );
}

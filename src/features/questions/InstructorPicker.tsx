import { useState, type FormEvent } from "react";
import { Button, Notice, Panel, TextField } from "../../components/ui";

/** FLEX applications are per instructor: choose one, or add the one who would teach. */
export default function InstructorPicker({ options, busy, error, onSelect, onAdd }: {
  options: { id: string; name: string }[]; busy: boolean; error?: string;
  onSelect: (id: string) => void; onAdd: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const submit = (e: FormEvent) => { e.preventDefault(); if (name.trim()) onAdd(name.trim()); };
  return (
    <Panel className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-xl">Which instructor is this application for?</h2>
        <p className="mt-1 text-muted">This program applies to one instructor at a time, so studio details alone aren't enough.</p>
      </div>
      {options.length > 0 ? (
        <ul className="space-y-2">
          {options.map((o) => (
            <li key={o.id}>
              <button type="button" disabled={busy} onClick={() => onSelect(o.id)}
                className="w-full rounded-field border border-mist bg-surface px-4 py-3 text-left font-semibold hover:border-ocean hover:bg-foam disabled:opacity-50">
                {o.name || "Unnamed instructor"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Notice tone="jelly" title="No instructors yet">Add the instructor who would teach.</Notice>
      )}
      {error && <Notice tone="coral" title={error} />}
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3 border-t border-mist pt-5">
        <div className="min-w-[14rem] flex-1">
          <TextField id="new-instructor" label="Add an instructor" value={name} placeholder="Full name" onChange={(e) => setName(e.target.value)} />
        </div>
        <Button type="submit" variant="secondary" busy={busy} disabled={!name.trim()}>Add and continue</Button>
      </form>
    </Panel>
  );
}

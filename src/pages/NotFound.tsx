import { useState, type FormEvent } from "react";
import { Button, PageTitle, Panel, TextField } from "../components/ui";
import { navigate } from "../lib/router";
import { savedToken } from "../lib/local";

// Shown when a private link is wrong or expired.
export function NotFoundLink() {
  return (
    <Panel className="max-w-xl">
      <h1 className="text-2xl">This link doesn't open a business profile</h1>
      <p className="mt-2 text-muted">Check that you copied the whole link. If you've lost it, start a new profile.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={() => { savedToken.clear(); navigate("/start"); }}>Start a new profile</Button>
        <Button variant="secondary" onClick={() => navigate("/applications")}>Paste my link</Button>
      </div>
    </Panel>
  );
}

// "My applications" without a remembered link: ask for it.
export function OpenLink() {
  const [v, setV] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const t = savedToken.get();
  if (t) { navigate(`/s/${t}/applications`, true); return null; }
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const m = v.match(/\/s\/([A-Za-z0-9_-]{43})/) ?? v.match(/^([A-Za-z0-9_-]{43})$/);
    if (!m) { setErr("Paste the full private link we gave you."); return; }
    navigate(`/s/${m[1]}/applications`);
  };
  return (
    <>
      <PageTitle sub="Your applications are saved to a private link, not an account.">My applications</PageTitle>
      <Panel className="max-w-xl">
        <form onSubmit={submit} className="space-y-4">
          <TextField id="link" label="Your private link" value={v} error={err} placeholder="https://…/s/…" onChange={(e) => setV(e.target.value)} />
          <div className="flex flex-wrap gap-3">
            <Button type="submit">Open my applications</Button>
            <Button type="button" variant="secondary" onClick={() => navigate("/start")}>Start a new profile</Button>
          </div>
        </form>
      </Panel>
    </>
  );
}

export default function NotFound() {
  return (
    <Panel className="max-w-xl">
      <h1 className="text-2xl">We couldn't find that page</h1>
      <p className="mt-2 text-muted">The address may be mistyped.</p>
      <Button className="mt-4" onClick={() => navigate("/")}>Go to the start</Button>
    </Panel>
  );
}

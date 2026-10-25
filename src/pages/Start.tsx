import { useState, type FormEvent } from "react";
import { Button, Notice, PageTitle, Panel, Progress, Steps, TextField } from "../components/ui";
import { navigate } from "../lib/router";
import { api, ApiError } from "../lib/api";
import { draftImport } from "../lib/local";
import { INTAKE_STEPS } from "../lib/steps";

const STAGES = ["Reading your website", "Extracting business information", "Preparing your profile"];

export default function Start() {
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  async function importSite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStage(0);
    const timers = [setTimeout(() => setStage(1), 2500), setTimeout(() => setStage(2), 6000)];
    try {
      const result = await api.extract(url.trim());
      timers.forEach(clearTimeout);
      setStage(3);
      draftImport.set({ ...result, source: "website" });
      navigate("/profile/new");
    } catch (err) {
      timers.forEach(clearTimeout);
      setStage(-1);
      setError(err instanceof ApiError ? err.message : "We couldn't read that website.");
    }
  }

  const manual = () => { draftImport.set({ source: "manual" }); navigate("/profile/new"); };

  return (
    <>
      <Steps steps={INTAKE_STEPS} current={0} />
      <PageTitle sub="Start from your website, or type your details. Both lead to the same review.">
        Set up your business profile
      </PageTitle>

      {stage >= 0 ? (
        <Panel className="max-w-xl">
          <h2 className="mb-5 text-xl">Importing from {url}</h2>
          <Progress stages={STAGES} active={stage} />
        </Panel>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <Panel>
            <h2 className="text-2xl">Import from website</h2>
            <p className="mt-1 text-muted">Let us prepare your business profile from your website.</p>
            <form onSubmit={importSite} className="mt-5 space-y-4">
              <TextField id="site" label="Website URL" type="text" inputMode="url" placeholder="yourstudio.com"
                value={url} onChange={(e) => setUrl(e.target.value)} required />
              {error && (
                <Notice tone="coral" title="We couldn't import that website">
                  <p>{error}</p>
                  <p className="mt-2">Try another URL, or enter your details manually.</p>
                </Notice>
              )}
              <Button type="submit">Import business details</Button>
            </form>
          </Panel>
          <Panel className="flex flex-col">
            <h2 className="text-2xl">Enter manually</h2>
            <p className="mt-1 text-muted">Tell us about your business yourself.</p>
            <div className="mt-auto pt-5">
              <Button variant="secondary" onClick={manual}>Enter business details</Button>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}

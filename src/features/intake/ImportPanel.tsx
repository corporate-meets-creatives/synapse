import type { FormEvent } from "react";
import { Button, Notice, Panel, Progress, TextArea } from "../../components/ui";
import { TEXT_STAGES, URL_STAGES, useImport } from "./useImport";

/** The one place an owner starts: paste a link, or choose manual entry. Used on the landing page and /start. */
export default function ImportPanel({ prominent = false }: { prominent?: boolean }) {
  const imp = useImport();
  const submit = (e: FormEvent) => { e.preventDefault(); void imp.run("url"); };

  if (imp.busy) {
    return (
      <Panel className="max-w-xl">
        <h2 className="mb-1 text-xl">Finding your business</h2>
        <p className="mb-5 truncate text-sm text-muted">{imp.mode === "url" ? imp.url : "From the text you pasted"}</p>
        <Progress stages={imp.mode === "url" ? URL_STAGES : TEXT_STAGES} active={imp.stage} />
        <p className="mt-5 text-sm text-muted">This usually takes a few seconds. You'll check everything before it's saved.</p>
      </Panel>
    );
  }

  return (
    <div className="max-w-xl space-y-4">
      <form onSubmit={submit} className={prominent ? "rounded-panel border border-mist bg-surface p-3 shadow-sm sm:p-4" : ""}>
        <label htmlFor="site" className={prominent ? "sr-only" : "mb-1.5 block font-semibold"}>Your website or social page</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input id="site" type="text" inputMode="url" autoComplete="url" placeholder="yourstudio.com or facebook.com/yourstudio"
            value={imp.url} onChange={(e) => imp.setUrl(e.target.value)}
            className="min-w-0 flex-1 rounded-field border border-mist bg-surface px-4 py-3 text-lg text-ink placeholder:text-muted/70" />
          <Button type="submit" disabled={!imp.url.trim()} className="whitespace-nowrap px-6 py-3 text-lg">Find opportunities</Button>
        </div>
      </form>
      <p className="text-sm text-muted">
        Prefer not to share a link?{" "}
        <button type="button" onClick={imp.manual} className="font-semibold text-ocean underline">Enter your details manually</button>
      </p>

      {imp.failure && (
        <Panel className="space-y-4 border-coral/40">
          <Notice tone="coral" title="We couldn't import that page">
            <p>{imp.failure.message}</p>
            <p className="mt-1">Nothing you typed is lost. Choose how to continue:</p>
          </Notice>
          {imp.failure.offerPaste && (
            <div className="space-y-3">
              <TextArea id="pasted" label="Paste text from your page" rows={5} value={imp.text} maxLength={20000}
                hint="Copy your About or Contact text from your site or social page. We only read what you paste."
                onChange={(e) => imp.setText(e.target.value)} />
              <Button variant="secondary" disabled={!imp.text.trim()} onClick={() => void imp.run("text")}>Use this text</Button>
            </div>
          )}
          <div className="flex flex-wrap gap-3 border-t border-mist pt-4">
            <Button variant="secondary" onClick={imp.manual}>Enter details manually</Button>
            <Button variant="quiet" onClick={() => void imp.run("url")}>Try the link again</Button>
          </div>
        </Panel>
      )}
    </div>
  );
}

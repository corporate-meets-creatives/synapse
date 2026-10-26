import { useEffect, useState } from "react";
import type { Application } from "../../../shared/schemas";
import { Badge, Button, Notice } from "../../components/ui";
import type { FormDef } from "../../lib/api";
import type { UiQuestion } from "../../lib/useQuestions";
import { buildPacket, detectAssistant, sendPacket } from "./assistant";

/** "Fill it for me": hands the approved answers to the browser assistant, then opens the official page. Never submits. */
export default function AssistantPanel({ form, questions, app, officialUrl }: { form: FormDef | null; questions: UiQuestion[]; app: Application; officialUrl: string | undefined }) {
  const packet = buildPacket(form, questions, app);
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!packet) return;
    let live = true;
    detectAssistant().then((ok) => { if (live) setInstalled(ok); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!packet]);

  if (!packet || !form?.assistant) return null;
  const site = new URL(form.assistant.site.origin).hostname;

  async function fill() {
    setBusy(true);
    setError(null);
    const r = await sendPacket(packet!);
    setBusy(false);
    if (!r.ok) { setError(r.error ?? "We couldn't hand your answers to the assistant."); return; }
    setSent(true);
    if (officialUrl) window.open(officialUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-5 border-t border-mist pt-5">
      <div className="flex flex-wrap items-center gap-2"><h3 className="text-base">Fill it for me</h3><Badge tone="jelly">Beta</Badge></div>
      {installed ? (
        <>
          <p className="mt-2 text-sm text-muted">
            The Wellyfish assistant will open {site} and offer to type your {packet.fields.length} reviewed answers into the form. You check them and press Submit yourself.
          </p>
          {error && <div className="mt-3"><Notice tone="coral" title={error} /></div>}
          {sent && <div className="mt-3"><Notice tone="lagoon" title="Opened the official page">Click “Fill the form” in the Wellyfish box on that page. Nothing is submitted for you.</Notice></div>}
          <Button className="mt-3 w-full" busy={busy} onClick={fill}>{sent ? "Send my answers again" : "Fill the form for me"}</Button>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted">
          {installed === null ? "Checking for the Wellyfish assistant…" : <>Install the Wellyfish assistant in Chrome (Extensions → Load unpacked → the <code>agent/autofill</code> folder) to have this form filled for you. Until then, use the copy buttons.</>}
        </p>
      )}
    </div>
  );
}

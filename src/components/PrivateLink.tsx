import { useState } from "react";
import { Notice } from "./ui";

// Shows the owner's private link with a copy button. Anyone with the link can open the profile.
export default function PrivateLink({ token, compact = false }: { token: string; compact?: boolean }) {
  const url = `${window.location.origin}/s/${token}/applications`;
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("failed"); // clipboard blocked: the link stays selectable below
    }
  }

  return (
    <div className="rounded-panel border border-jelly/30 bg-jelly-soft p-4 sm:p-5">
      <p className="font-semibold">{compact ? "Your private link" : "Save your private link"}</p>
      {!compact && (
        <p className="mt-1 text-sm">
          There's no password. This link is how you come back to your profile and applications, so bookmark it or email it to yourself.
        </p>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input readOnly value={url} aria-label="Your private link" onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-field border border-mist bg-surface px-3 py-2 text-sm text-ink" />
        <button type="button" onClick={copy}
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ocean-deep">
          {state === "copied" ? "Copied" : "Copy link"}
        </button>
      </div>
      {state === "failed" && <p className="mt-2 text-sm text-coral-deep">Your browser blocked copying. Select the link above and copy it yourself.</p>}
      <div className="mt-3">
        <Notice tone="coral" title="Anyone with this link can see and edit your profile">
          Share it only with people who help run your studio.
        </Notice>
      </div>
    </div>
  );
}

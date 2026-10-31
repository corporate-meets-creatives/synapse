import { PageTitle, Steps } from "../components/ui";
import ImportPanel from "../features/intake/ImportPanel";
import { INTAKE_STEPS } from "../lib/steps";

export default function Start() {
  return (
    <>
      <Steps steps={INTAKE_STEPS} current={0} />
      <PageTitle sub="We draft the vendor form from your website if you have one, or from what you type. Either way, you review it before anything goes to a vendor.">
        Start with your studio.
      </PageTitle>
      <ImportPanel />
      <details className="mt-8 max-w-2xl rounded-panel border border-jelly/30 bg-jelly-soft p-5">
        <summary className="cursor-pointer font-semibold text-ocean">See a Salsa con Todo example</summary>
        <p className="mt-3 text-sm font-semibold text-[#5a3fc0]">Example only. This is a demo draft, not a submitted application.</p>
        <dl className="mt-3 space-y-3 text-sm">
          <div><dt className="font-semibold">Studio</dt><dd>Salsa con Todo, a Latin dance school in Fremont, Seattle</dd></div>
          <div><dt className="font-semibold">Pitch to vendors <span className="ml-1 rounded-full bg-surface px-2 py-0.5 text-xs">AI-drafted — review</span></dt>
            <dd>Beginner-friendly salsa and bachata classes where members can drop in after work, no partner needed.</dd></div>
          <div><dt className="font-semibold">Instructor certifications <span className="ml-1 rounded-full bg-coral-soft px-2 py-0.5 text-xs text-coral-deep">Couldn't confirm — check this</span></dt>
            <dd className="text-muted">Left blank: not stated publicly, so we don't guess.</dd></div>
          <div><dt className="font-semibold">Tax ID and bank details</dt><dd className="text-muted">Never collected. The owner enters these on the vendor's own form.</dd></div>
        </dl>
      </details>
    </>
  );
}

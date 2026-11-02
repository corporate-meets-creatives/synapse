import type { ReactNode } from "react";
import { Badge, ButtonLink, PageTitle } from "../components/ui";
import { Section } from "../components/Section";

const CRITERIA = ["Instructors", "Partner fellowship", "Class offerings", "Reputation", "Facility quality", "Community involvement"];

// Same icon-tile treatment as How it works on the home page.
const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const BASICS: { title: string; text: string; icon: ReactNode; tile: string }[] = [
  { title: "Set aside for each employee", text: "Employers allocate a set amount to each employee every year, often $500 to $2,000.",
    icon: icon(<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></>), tile: "bg-[#e3ebfd] text-ocean-deep" },
  { title: "Classes count", text: "Fitness, dance and yoga classes are a common eligible expense, alongside gym memberships and workout apps.",
    icon: icon(<><circle cx="12" cy="5" r="2" /><path d="M12 7v6m0 0-3 7m3-7 3 7M7 10l5-1 5 1" /></>), tile: "bg-lagoon-soft text-[#0b6f6a]" },
  { title: "Types of LSAs", text: "Some are reimbursement accounts: the employee pays, then submits the receipt. Others load the money onto a card they pay with.",
    icon: icon(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>), tile: "bg-jelly-soft text-[#5a3fc0]" },
];

const FAQ = [
  ["Does Wellyfish submit the application for me?", "No. We draft it and flag anything we couldn't confirm. You review it and click Submit on the vendor's form yourself."],
  ["Will I get accepted?", "We can't promise that. Vendors decide who joins their network. Wellyfish gets you a ready-to-submit application, not a guarantee."],
  ["Do I have to change my prices?", "With FitOn Health, pricing is agreed per studio with their team. Wellyfish doesn't set or promise rates."],
];

export default function WhatIsLsa() {
  return (
    <article className="max-w-3xl">
      <PageTitle sub="A lifestyle spending account is wellness money an employer sets aside for each employee. Some of your students already have one, and it could cover a class at your studio.">
        What's an LSA?
      </PageTitle>
      <div className="mt-8 grid gap-x-8 gap-y-8 rounded-panel bg-surface px-6 py-8 sm:grid-cols-3 sm:px-8">
        {BASICS.map((b) => (
          <div key={b.title}>
            <span className={`grid h-14 w-14 place-items-center rounded-panel ${b.tile}`}>{b.icon}</span>
            <h3 className="mt-4 text-lg">{b.title}</h3>
            <p className="mt-2 text-muted">{b.text}</p>
          </div>
        ))}
      </div>

      <Section compact id="local" title="One Seattle employer, up to $77 million a year">
        <p className="text-lg">
          Microsoft's Perks+ gives each US employee $1,500 a year for wellbeing, and the policy names dance under both
          fitness classes and learning. Forma runs it as a reimbursement program. About 51,400 people work for Microsoft
          in the Seattle metro, so that one company puts up to roughly $77 million a year within reach of local studios.
        </p>
      </Section>

      <Section compact id="routes" title="Two ways wellness money reaches a studio"
        lede="For a studio owner, what matters is how the money gets to you. The two routes ask different things of you.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-panel bg-surface p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg">Wellness benefit vendors</h3>
              <Badge tone="lagoon">Where Wellyfish helps today</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">FitOn Health, Wellhub, ClassPass</p>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>Employers and health plans give members monthly credits.</li>
              <li>Credits only work at gyms and studios in the vendor's network. <strong>If your studio isn't listed, members can't find you.</strong></li>
              <li>To get listed, you apply to the vendor. Wellyfish drafts that application.</li>
            </ul>
          </div>
          <div className="rounded-panel bg-surface p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg">Lifestyle spending accounts</h3>
              <Badge tone="jelly">On our roadmap</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">Forma, Microsoft Perks+</p>
            <ul className="mt-4 list-disc space-y-2 pl-5">
              <li>Your student pays you as usual, either with an LSA card or out of pocket and then claims it back.</li>
              <li>Whether a class counts is set by the employer's plan, not by you.</li>
              <li>Nothing points LSA holders to your studio. Later, Wellyfish will help with eligibility and receipts.</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section compact id="criteria" title="What a vendor looks for"
        lede="Each vendor has its own criteria. For example, FitOn Health screens studios on six things.">
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 md:grid-cols-3">
          {CRITERIA.map((c) => <li key={c} className="rounded-field bg-surface px-4 py-3 font-medium">{c}</li>)}
        </ul>
        <p className="mt-6 text-muted">
          Studios apply through FitOn's facilities page. Pricing is set per studio with a FitOn wellness consultant, and
          payouts come as a monthly reimbursement.
        </p>
      </Section>

      <Section compact id="chains" title="The money is going to the big chains">
        <p className="text-lg">
          A chain has staff to manage benefit partnerships, while a two-instructor dance studio doesn't.
        </p>
      </Section>

      <Section compact id="faq" title="Common questions">
        <dl className="space-y-6">
          {FAQ.map(([q, a]) => (
            <div key={q}>
              <dt className="font-semibold">{q}</dt>
              <dd className="mt-1 text-muted">{a}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-10"><ButtonLink to="/start">Start with your studio site</ButtonLink></div>
      </Section>
    </article>
  );
}

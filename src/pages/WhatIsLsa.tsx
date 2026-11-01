import { Badge, ButtonLink, PageTitle } from "../components/ui";
import { Section } from "../components/Section";

const CRITERIA = ["Instructors", "Partner fellowship", "Class offerings", "Reputation", "Facility quality", "Community involvement"];

const FAQ = [
  ["Does Wellyfish submit the application for me?", "No. We draft it and flag anything we couldn't confirm. You review it and click Submit on the vendor's form yourself."],
  ["Will I get accepted?", "We can't promise that. Vendors are invitation-only and screen every studio. Wellyfish gets you a ready-to-submit application, not a guarantee."],
  ["Do I have to change my prices?", "With FitOn Health, pricing is agreed per studio with their team. Wellyfish doesn't set or promise rates."],
];

export default function WhatIsLsa() {
  return (
    <article className="max-w-3xl">
      <PageTitle sub="A lifestyle spending account is wellness money an employer sets aside for each employee. Some of your students already have one, and it could cover a class at your studio.">
        What's an LSA?
      </PageTitle>
      <p className="text-sm text-muted">Not Google's Local Services Ads, which are also called LSAs. This page is about wellness benefits.</p>

      <div className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-3">
        {[
          ["The employer pays in", "Each employee gets a set amount a year. Most employers put in $500 to $2,000."],
          ["Classes count", "Fitness classes are a common eligible expense, alongside gym memberships and workout apps."],
          ["Paid back later", "Most LSAs are reimbursement accounts: the employee pays, then claims the money back."],
        ].map(([h, t]) => (
          <div key={h}>
            <h3 className="text-lg">{h}</h3>
            <p className="mt-2 text-muted">{t}</p>
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
              <li>Employers and health plans give members monthly credits. A yoga class might cost 8 credits.</li>
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
              <li>Your student pays you as usual, then submits the receipt to get reimbursed.</li>
              <li>Whether a class counts is set by the employer's plan, not by you.</li>
              <li>Nothing points LSA holders to your studio. Later, Wellyfish will help with eligibility and receipts.</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section compact id="criteria" title="What a vendor looks for"
        lede="We're starting with FitOn Health. It's free to join but invitation-only, and it screens studios on six things.">
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
          On employer wellness budgets tracked by Ramp, spending at low-cost gym chains grew 20% while boutique studios
          fell 3% year over year. A chain has staff to manage benefit partnerships. A two-instructor dance studio
          doesn't, so it never shows up in the app where members look.
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

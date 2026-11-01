import type { ReactNode } from "react";
import { Jellyfish } from "../components/ui";
import { Link } from "../components/Link";
import { Section } from "../components/Section";
import ImportPanel from "../features/intake/ImportPanel";

const PROBLEMS = [
  ["You don't know to look", "Nothing tells a dance teacher that a student's employer or health plan could already pay for their class."],
  ["You can't tell if you fit", "Vendors screen on instructors, classes, reputation, facility quality and community involvement. It's hard to know how you'd come across."],
  ["Applying eats teaching time", "Every hour on a partner form is an hour not teaching. And an empty spot in Friday's class is revenue that's gone for good."],
];

// Stroke icons for the How it works steps (decorative; the step text carries the meaning).
const icon = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
const ICONS = {
  site: icon(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" /></>),
  search: icon(<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>),
  draft: icon(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>),
  submit: icon(<><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.8 2.8L16.5 9.5" /></>),
};

// Tile colors follow the brand meanings: ocean = your action, jelly = AI-drafted, lagoon = done.
const STEPS: { title: string; text: string; icon: ReactNode; tile: string }[] = [
  { title: "Type your studio's website", text: "Example: Salsa con Todo, a Latin dance school in Fremont.", icon: ICONS.site, tile: "bg-[#e3ebfd] text-ocean-deep" },
  { title: "We pull what's already public", text: "Classes, schedule, address, press and how you take bookings. No research from you.", icon: ICONS.search, tile: "bg-jelly-soft text-[#5a3fc0]" },
  { title: "We draft the application", text: "Including a short pitch. Anything we couldn't confirm is left blank and flagged, not guessed.", icon: ICONS.draft, tile: "bg-jelly-soft text-[#5a3fc0]" },
  { title: "You review and submit", text: "Edit what you like, then click Submit on the vendor's own form.", icon: ICONS.submit, tile: "bg-lagoon-soft text-[#0b6f6a]" },
];

const WILL = [
  "Suggest which vendor platforms are a fit for your studio",
  "Pull what's already public about your studio",
  "Fill in the vendor's application and write your pitch",
  "Flag anything we couldn't confirm instead of guessing",
];

const NEVER = [
  "Submit a form for you",
  "Create accounts in your name",
  "Sign agreements",
  "Enter banking or payout details",
];

export default function Welcome() {
  return (
    <>
      {/* Hero */}
      <section className="grid items-center gap-10 pb-12 pt-4 md:grid-cols-[1.4fr_1fr] md:pb-16 md:pt-10">
        <div>
          <p className="font-display text-lg font-semibold text-ocean">There's plenty of benefits in the sea.</p>
          <h1 className="mt-3 text-4xl leading-[1.1] sm:text-5xl">Get your studio listed where wellness benefits get spent.</h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Employers and health plans give people credits for fitness classes through wellness benefits like
            lifestyle spending accounts (LSAs). But the credits only work at studios listed with their wellness benefit
            vendors, like FitOn Health, Wellhub and ClassPass.
          </p>
          <p className="mt-3 max-w-xl text-lg text-muted">
            Wellyfish suggests which vendors fit your studio and drafts the application from your website. You review
            it and submit it.
          </p>
          <div className="mt-8"><ImportPanel prominent /></div>
          <p className="mt-6 text-sm text-muted">
            Built for small Seattle-area dance studios. New to this?{" "}
            <Link to="/what-is-an-lsa" className="font-semibold text-ocean underline underline-offset-2">What's an LSA?</Link>
          </p>
        </div>
        <div className="relative mx-auto hidden aspect-square w-full max-w-sm place-items-center md:grid">
          <div className="absolute inset-6 rounded-full bg-gradient-to-br from-[#dbe7ff] via-jelly-soft to-coral-soft" aria-hidden="true" />
          <span className="absolute left-10 top-12 h-4 w-4 rounded-full border-2 border-lagoon/60" aria-hidden="true" />
          <span className="absolute right-14 top-24 h-2.5 w-2.5 rounded-full bg-ocean/40" aria-hidden="true" />
          <span className="absolute bottom-16 left-16 h-3 w-3 rounded-full border-2 border-coral/60" aria-hidden="true" />
          <Jellyfish size={220} className="drift relative" />
        </div>
      </section>

      <Section id="why" title="Why small studios miss out"
        lede="You run a small studio and teach many of the classes yourself. The business side happens in the gaps between them.">
        <div className="grid gap-x-10 gap-y-8 md:grid-cols-3">
          {PROBLEMS.map(([h, t]) => (
            <div key={h}>
              <h3 className="text-lg">{h}</h3>
              <p className="mt-2 text-muted">{t}</p>
            </div>
          ))}
        </div>
      </Section>

      <section aria-labelledby="how" className="rounded-panel bg-surface px-6 py-10 sm:px-10 sm:py-12">
        <h2 id="how" className="text-2xl sm:text-3xl">How it works</h2>
        <ol className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <div className="flex items-center gap-3">
                <span className={`grid h-14 w-14 place-items-center rounded-panel ${s.tile}`}>{s.icon}</span>
                <span className="font-display text-sm font-semibold text-muted">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg">{s.title}</h3>
              <p className="mt-2 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <Section id="control" title="We write. You review and submit."
        lede="Wellyfish suggests which vendor platforms are a fit for you and gets you a ready-to-submit application, but it doesn't guarantee acceptance.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-panel bg-surface p-6">
            <h3 className="text-lg">Wellyfish will…</h3>
            <ul className="mt-4 space-y-3">
              {WILL.map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 font-bold text-lagoon" aria-hidden="true">✓</span>{t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-panel bg-surface p-6">
            <h3 className="text-lg">Wellyfish will never…</h3>
            <ul className="mt-4 space-y-3">
              {NEVER.map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 font-bold text-coral-deep" aria-hidden="true">✕</span>{t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
    </>
  );
}

import { Button, Jellyfish } from "../components/ui";
import ImportPanel from "../features/intake/ImportPanel";
import { navigate } from "../lib/router";
import { savedToken } from "../lib/local";

export default function Welcome() {
  const token = savedToken.get();
  return (
    <>
    <section className="grid items-center gap-10 py-6 md:grid-cols-[1.2fr_1fr] md:py-14">
      <div>
        <h1 className="text-4xl leading-tight sm:text-5xl sm:leading-[1.08]">Your students already have money for your classes. They just can't spend it with you.</h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Employers and health plans already set aside wellness credits. Big chains show up in those apps because they have staff to apply. A small studio doesn't, so it stays invisible, even with empty spots in class. Wellyfish drafts the vendor application. You review it and submit it.
        </p>
        <div className="mt-8"><ImportPanel prominent /></div>
        <div className="mt-5">
          <Button variant="quiet" onClick={() => navigate(token ? `/s/${token}/applications` : "/applications")}>
            My applications
          </Button>
        </div>
        <p className="mt-8 max-w-md text-sm text-muted">
          Built for small Seattle-area dance studios. You review every answer before anything is shared.
        </p>
      </div>
      <div className="relative mx-auto grid aspect-square w-full max-w-sm place-items-center">
        <div className="absolute inset-6 rounded-full bg-gradient-to-br from-[#dbe7ff] via-jelly-soft to-coral-soft" aria-hidden="true" />
        <span className="absolute left-10 top-12 h-4 w-4 rounded-full border-2 border-lagoon/60" aria-hidden="true" />
        <span className="absolute right-14 top-24 h-2.5 w-2.5 rounded-full bg-ocean/40" aria-hidden="true" />
        <span className="absolute bottom-16 left-16 h-3 w-3 rounded-full border-2 border-coral/60" aria-hidden="true" />
        <Jellyfish size={220} className="drift relative" />
      </div>
    </section>
    <section aria-labelledby="why" className="py-10">
      <h2 id="why" className="mb-5 text-3xl">Why small studios miss out</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["You don't know to look", "Nothing tells a dance teacher that a student's employer or health plan could already pay for their class."],
          ["You can't tell if you fit", "Vendors screen on instructors, classes, reputation, facility quality, and community involvement. Owners have no easy way to tell how they'd come across."],
          ["Applying eats teaching time", "Every hour on a partner form is an hour not teaching. And an empty spot in Friday's class is revenue that's gone for good."],
        ].map(([h, t]) => (
          <div key={h} className="rounded-panel border border-mist bg-surface p-5">
            <h3 className="text-xl">{h}</h3>
            <p className="mt-2 text-muted">{t}</p>
          </div>
        ))}
      </div>
    </section>
    <section aria-labelledby="how" className="py-10">
      <h2 id="how" className="mb-5 text-3xl">How it works</h2>
      <ol className="grid gap-4 md:grid-cols-4">
        {[
          ["Type the studio name", "Example: Salsa con Todo, a Latin dance school in Fremont."],
          ["We pull what's already public", "Classes, schedule, address, press, and how it takes bookings, with no manual research from you."],
          ["We draft the application and pitch", "Anything we couldn't confirm is left blank and flagged, not guessed."],
          ["You review and submit", "Edit if needed, then you click Submit on the vendor form. Wellyfish never submits for you."],
        ].map(([h, t], i) => (
          <li key={h} className="rounded-panel border border-mist bg-surface p-5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-ocean font-bold text-white" aria-hidden="true">{i + 1}</span>
            <h3 className="mt-3 text-lg">{h}</h3>
            <p className="mt-1 text-sm text-muted">{t}</p>
          </li>
        ))}
      </ol>
      <p className="mt-5 max-w-2xl text-sm text-muted">
        Vendors are invitation-only and screen studios, so this gets you a ready-to-submit application. It doesn't guarantee acceptance.
      </p>
    </section>
    </>
  );
}

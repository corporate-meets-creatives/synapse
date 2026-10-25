import { Button, Jellyfish } from "../components/ui";
import ImportPanel from "../features/intake/ImportPanel";
import { navigate } from "../lib/router";
import { savedToken } from "../lib/local";

export default function Welcome() {
  const token = savedToken.get();
  return (
    <section className="grid items-center gap-10 py-6 md:grid-cols-[1.2fr_1fr] md:py-14">
      <div>
        <h1 className="text-4xl leading-tight sm:text-6xl sm:leading-[1.05]">Find the right support for your business.</h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Discover nearby providers and prepare your application using your business information.
        </p>
        <div className="mt-8"><ImportPanel prominent /></div>
        <div className="mt-5">
          <Button variant="quiet" onClick={() => navigate(token ? `/s/${token}/applications` : "/applications")}>
            My applications
          </Button>
        </div>
        <p className="mt-8 max-w-md text-sm text-muted">
          Built for dance studios and private practices in Bellevue. You review every answer before anything is shared.
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
  );
}

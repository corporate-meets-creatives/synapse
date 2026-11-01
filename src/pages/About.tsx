import { ButtonLink, PageTitle } from "../components/ui";
import { Section } from "../components/Section";

// TODO(team): add Diana's business. The link shows once `url` is set.
const PARTNER = { business: "", url: "" };

export default function About() {
  return (
    <article className="max-w-3xl">
      <PageTitle sub="Wellyfish started as a one-day build in Seattle on October 25, 2026. We liked the problem too much to stop.">
        About us
      </PageTitle>

      <figure className="mt-8">
        <img src="/team/hackathon-team.jpg" width={1600} height={1200} loading="eager"
          alt="The five Wellyfish teammates smiling around a conference table with laptops on hackathon day."
          className="w-full rounded-panel object-cover" />
        <figcaption className="mt-3 text-sm text-muted">Left to right: Yuliya, Alex, Diana, Vansh and Ashwini.</figcaption>
      </figure>

      <Section compact id="brief" title="Built at a hackathon">
        <p className="text-lg">
          The{" "}
          <a href="https://hack.claudeseattle.org/" target="_blank" rel="noreferrer" className="font-semibold text-ocean underline underline-offset-2">
            Claude Impact Lab Hackathon
          </a>{" "}
          asked for something a small business could use right away, not a pitch for a platform that needs years to
          work. We started with burnout, narrowed it to small dance studios, and followed the money to employer and
          health-plan wellness benefits. We submitted two minutes before the deadline, and Wellyfish placed third.
        </p>
      </Section>

      <Section compact id="heard" title="Studios aren't short on talent. They're short on time.">
        <p className="text-lg">
          Dance teachers can only teach so many hours in a day. When classes aren't full, some face a hard choice: stay
          in the profession, or take a part-time job. Meanwhile, money meant for exactly these classes sits in benefit
          apps they never show up in.
        </p>
      </Section>

      <Section compact id="partner" title="Grounded in a real studio's mission">
        <p className="text-lg">
          Our subject matter expert, Diana Toma, works with small creative businesses
          {PARTNER.business ? <> and runs {PARTNER.business}</> : null}. Her mission shaped ours: make art accessible to
          overwhelmed, burnt-out professionals.
        </p>
        {PARTNER.url && (
          <a href={PARTNER.url} target="_blank" rel="noreferrer" className="mt-4 inline-block font-semibold text-ocean underline underline-offset-2">
            Visit {PARTNER.business || "Diana's studio"}
          </a>
        )}
      </Section>

      <Section compact id="next" title="What's next">
        <p className="text-lg">
          A 30-day pilot with Seattle-area studios. We'll track applications submitted, how many fields owners had to
          change, studios invited into a vendor network, and each studio's first booked visit.
        </p>
        <div className="mt-8"><ButtonLink to="/start">Start with your studio site</ButtonLink></div>
      </Section>
    </article>
  );
}

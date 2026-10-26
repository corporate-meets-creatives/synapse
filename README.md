# Wellyfish

*There's plenty of benefits in the sea.*

Oct 25, 2026 · Claude Impact Lab Hackathon, Seattle

**Wellyfish:** takes the thinking out of applying to corporate and wellness benefit hub vendors for small businesses, starting with FitOn Health (today's use case with the ability to scale to other platforms in the future). The owner types the studio's name, the agent fills the FitOn facility intake form, then the owner clicks Submit. Members with employer- or health-plan-funded fitness credits can then book the studio's classes.

**Mission:** connect small to mid-sized creative businesses to the wellness dollars employers and health plans have already set aside, so burned-out people get to dance and studios will get paid. 

## The Problem

Large employers often set aside wellness budgets for their employees. Microsoft is one significant example in the Seattle area. Its perks+ program gives each US corporate employee $1,500 a year for wellbeing, and the policy names dance under both fitness classes and learning (Microsoft Perks+). Microsoft employs about 51,400 people in the Seattle metro division (HUD Seattle-Bellevue-Kent profile, July 2025), so one company alone puts up to roughly $77 million a year within reach of local studios.

That money moves through benefit platforms. Perks+ runs on Forma, and many other employers and health plans buy FitOn Health, which serves more than 19,000 employers alongside national health plans, including Medicare plans (FitOn Health partner guide). FitOn members get monthly credits and spend them at the gyms and studios in its network. A studio outside the network doesn't exist for them.

That money tends to land at the big chains. On employer wellness budgets tracked by Ramp, spending at low-cost gym chains grew 20% while boutique studios fell 3% year over year (Ramp). A chain has staff to manage benefit partnerships. A two-instructor dance studio doesn't, so it never shows up in the app where members look.

Small studios need that demand. In 2021 the average Puget Sound arts and culture worker earned $52,400 including benefits, 52.8% below the regional average (PSRC), and about 30% of cultural workers surveyed were considering leaving the sector (PSRC). Nearly 60% of dance studios nationally are under 75% capacity or don't know their capacity (DSOA 2024 survey, via DanceStudio-Pro). Every empty spot in Friday's class is revenue that's gone for good.

The door is already open. FitOn markets itself to studios as a free-to-join bridge to insurance dollars (FitOn Health partner flyer). But owners don't know it exists, can't tell whether they'd qualify, and don't have time between classes to work out the application. Wellyfish takes the thinking out of that step.

The business owner we're building with has a simple mission: make art accessible to overwhelmed, burnt-out professionals. Those people already have money set aside to spend on it. The studios just don't see it.

## Users

**The studio owner is the primary user.** They run a small Seattle-area studio and often teach the classes too, doing the business side in the gaps between them. They grow through word of mouth and relationships, have little budget, and want proof a tool works before they give it their time. Our example is Salsa con Todo, a Latin dance school in its own studio in Fremont (The Stranger). It's well loved and well established, but is still not visible to anyone browsing employee fitness benefit.

**The FitOn member benefits too.** Their employer or health plan gives them monthly credits, and they might happily spend them on a salsa class. But they default to gyms, because that's what the app shows them. Many FitOn members come through Medicare plans, which suits Latin and ballroom studios, whose students tend to skew older.

## Job to be done

**Core job:** fill classes with paying clients.

### Where owners get stuck

Based on our discovery with our Subject Matter Expert and business owner Diana Toma, we learned where small dance studio owners get stuck:

- **They don't know to look.** Nothing tells a Fremont salsa teacher that a student's employer or health plan funds benefits that could cover a class at their studio. Creatives think about finding a space to do what they do well, not about which programs could subsidize them.
- **They can't tell what fits.** FitOn is invitation-based and screens studios on six criteria, from instructors to community involvement. An owner has no easy way to know whether they'd qualify or how to present themselves.
- **Applying eats teaching time.** Every hour spent on wellness hub submission forms is an hour not spent teaching or running the studio.

Signals from the Seattle small-business survey: getting people in the door is the top challenge, owners want tools that fit what they already use, and value has to show fast.

## How FitOn Health works for a studio

*Source for this section: FitOn Health partner guide (July 2023) unless noted.*

- Members get monthly credits from an employer or health plan and redeem them for classes and memberships.
- **Pricing** is set per studio with a FitOn wellness consultant, not a fixed discount.
- **Booking:** Mindbody studios link a Site ID and sync. Others receive the roster by email and check confirmations at the door.
- **Payouts:** monthly reimbursement summary, 3 days to dispute, direct deposit via Bill.com.
- **Getting in:** invitation-only, screened on instructors, partner fellowship, class offerings, reputation, facility quality and community involvement. Studios apply through the facilities page, free to join (FitOn flyer). Members can also nominate a studio (FitOn help center).
- **Flex:** some plans let members spend credits anywhere that takes a card (BCBSRI), but the studio stays invisible in the directory.

Wellyfish fills the facility form and writes the pitch against the six criteria.

## Who uses FitOn Health (the market)

FitOn doesn't publish its employer list. The named clients we could confirm are mostly health plans:

| Organization | Who gets FitOn Health | Source |
|---|---|---|
| Highmark (Blue Cross Blue Shield) | Medicare Advantage and Medigap members, 32 credits a month; employer retiree groups such as Penn State's | Highmark, Penn State |
| Blue Cross NC | Blue Medicare Advantage and Medicare Supplement members | Blue Cross NC |
| Excellus BlueCross BlueShield (NY) | Medicare members, 36 credits a month | Excellus |
| Blue Cross Blue Shield of Rhode Island | Members, through Preferred and Flex networks, from 2025 | BCBSRI |
| Aetna | Student health plan members | TTUHSC flyer |
| Cigna, Wellcare | Plan partnerships inherited from Peerfit in 2022 | Athletech News |
| Los Angeles Firemen's Relief Association | Unlimited access to FitOn gyms and studios | LAFRA |
| Premera Blue Cross (WA) | Medicare Advantage from 2024; Premera says FitOn stopped serving it on July 31, 2025 | Premera 2024, Premera 2025 |

FitOn also sells through HealthFitness, Trustmark's corporate fitness business (Trustmark), and the Workday Marketplace (FitOn Health). In Seattle, the YMCA accepts FitOn through select Washington Medicare plans (Seattle YMCA).

## Problem statement

FitOn Health credits reach a studio only if the studio is in FitOn's network. Owners don't know the network exists, can't tell whether they'd qualify, and don't have time to apply, so they stay invisible to members who already have money for classes like theirs.

## Priorities

- **P0, application effort (v1).** Scrape the studio's details and fill FitOn's facility form; the owner reviews and submits.
- **P0, awareness (v1).** Tell owners FitOn exists and what it pays for.
- **P1, fit check (future).** Score the studio against FitOn's six criteria and flag mismatches before applying.

## Example: Salsa con Todo

1. **Input.** The owner types "Salsa con Todo".
2. **Scrape.** The agent pulls everything public: 211 N 36th St, Fremont; Friday drop-ins in salsa, bachata, Brazilian zouk and kizomba from 6:50 PM, \$15 to \$20, with capacity limits and a social dance after (Salsa Vida); press coverage (The Stranger); and whether booking runs on Mindbody.
3. **Fill.** The agent fills FitOn's facility form with the studio's details, class types, schedule link and a short pitch. Fields it can't confirm are left blank and flagged. It stops before Submit.
4. **Submit.** The owner reviews, edits if needed, and clicks Submit.

### Edge cases/risks

- **Thin web presence:** no studio website or public schedule. The agent fills what it can and flags the gaps for the owner.
- **Conflicting info:** different prices or times across sites. The agent uses the studio's own site and flags the conflict.
- **Already on FitOn:** the agent finds the studio in FitOn's directory and stops.

## Success metrics

- **Demo:** studio name to a ready-to-submit FitOn form in one session, with no manual research and few owner edits.
- **30-day pilot:** forms submitted, fields the owner had to change, studios invited into the network, first FitOn-booked visit per studio.

## System design

The Owner types a name and clicks Submit; the agent does everything else, until the human confirms and hits submit. The fit check is a future feature.

### Components

- **Claude agent:** runs the steps and explains what it filled and what it couldn't.
- **Skill (SKILL.md):** the process plus a map from scraped details to FitOn's form fields. Runs from GitHub.
- **Web search and fetch:** scrapes the studio's site, Google listing, event listings, press and booking pages.
- **Browser automation:** fills the facility form and stops before Submit.

### Integrations

- **FitOn facility form:** browser fill; the owner submits.
- **Mindbody:** read-only check to pick the booking path. FitOn syncs with Mindbody through a Site ID.

**Human In The Loop Guardrails:** the agent never submits forms, creates accounts, signs agreements or enters banking details, including FitOn's Bill.com payouts.

**Non-goals (v1):** auto-submitting or signing contracts, an employer directory, payout modeling, member-facing discovery.

## Assumptions

- Studios (e.g., Salsa Con Todo) don't know FitOn exists and can be a source of revenue for them.
- Needs come from our owner discovery discussion and desk research.
- FitOn's July 2023 partner guide is still current.
- The agent can complete the form in a browser with the owner present.
- FitOn's Washington footprint is unconfirmed beyond the Seattle YMCA listing.
- FitOn's employer and member figures are self-reported.

## Potential Future Scope

- **Fit check:** score the studio against FitOn's six criteria before applying.
- Add more vendor platforms that the agent can help with: Wellhub, One Pass Select, ClassPass corporate, etc. All have slightly different forms and requirements.
- **LSA support:** eligibility checks and receipts for accounts like Microsoft Perks+.
- **Member nudges:** "Your benefit covers this class" flyers and QR codes.
- Clients and revenue by channel, via Mindbody.
- A map of which Seattle employers and plans offer FitOn.
- Municipal resources and other creative studios that fit mental health and wellness (art, music, martial arts).

## Brand guide

Logo, color meanings, type, components and voice are documented at [`/brand/`](https://wellyfish20.vercel.app/brand/), with the source in `public/brand/`. It mirrors the tokens in `src/index.css`, so update both together.

## Sources

- [FitOn Health Partner Start Guide (July 2023)](https://www.fitonhealth.com/hubfs/2023/Network/071823_FitOnHealth%20NetworkPartnerGuide.pptx.pdf)
- [FitOn Health partner flyer](https://www.fitonhealth.com/hubfs/2023/Network/FitOn_Network_Solutions_Flyer_Partner_General.pdf)
- [FitOn Health facilities page](https://www.fitonhealth.com/facilities)
- [FitOn Health help center: nominating a facility](https://www.fitonhealth.com/migration/help/medicare/what-if-there-are-no-fitness-facilities-in-my-area-1)
- [Microsoft Perks+](https://usbenefits.microsoft.com/us/en/perks-plus.html)
- [HUD Seattle-Bellevue-Kent Housing Market Profile (July 2025)](https://www.huduser.gov/portal/periodicals/USHMC/reg/SeattleBellevueKentWA-HMP-July25.pdf)
- [Highmark: FitOn Health fitness benefit](https://medicare.highmark.com/learn/plan-perks-and-services/highmark-fitness.html)
- [Penn State: Freedom Blue fitness benefits](https://hr.psu.edu/retiree/programs-resources/freedombluefitnessbenefits)
- [Blue Cross NC: FitOn Health](https://bluecrossnc.com/fiton)
- [Excellus BCBS: FitOn Health benefit flyer](https://medicare.excellusbcbs.com/documents/d/excellus-medicare/fiton-health-benefit-flyer)
- [BCBS of Rhode Island: FitOn networks](https://www.bcbsri.com/medicare/choose)
- [TTUHSC: FitOn Health flyer (Aetna)](https://www.ttuhsc.edu/student-life/documents/FitOn_Flyer.pdf)
- [Athletech News: FitOn acquires Peerfit](https://athletechnews.com/fiton-raises-40m-buys-peerfit/)
- [LAFRA: FitOn Health FAQs](https://www.lafra.org/fiton-health-total-fitness-program-faqs/)
- [Premera: FitOn Health for Medicare Advantage (2023)](https://www.premera.com/wa/producer/news/medicare/new-fitness-benefit/)
- [Premera: SilverSneakers replaces FitOn (2025)](https://www.premera.com/documents/069123.pdf)
- [Seattle YMCA: insurance provider partnerships](https://www.seattleymca.org/programs-for-health/insurance-provider-partnerships)
- [Trustmark: HealthFitness partners with FitOn Health](https://trustmarkbenefits.com/newsroom/press-release/healthfitness-partnership-fiton-health)
- [FitOn Health joins Workday Marketplace](https://www.fitonhealth.com/blog/fiton-health-joins-workday-marketplace)
- [Ramp: wellness program spend trends](https://ramp.com/velocity/wellness-program-spend-trends)
- [PSRC Arts and Culture Economic Recovery Strategy](https://www.psrc.org/media/6648)
- [DanceStudio-Pro: DSOA 2024 survey on class capacity](https://blog.dancestudio-pro.com/dont-let-underfilled-classes-hold-your-studio-back)
- [Salsa Vida: Salsa con Todo drop-in classes](https://www.salsavida.com/event/washington/seattle/salsa-con-todo-drop-in-classes/)
- [The Stranger: Salsa con Todo](https://www.thestranger.com/food-and-drink/stepping-to-the-beat-of-salsa-con-todo-66424732/)
- [Kickoff discussion transcript, Oct 25, 2026 (Gemini meeting notes)](https://docs.google.com/document/d/1a2AeWB7B6o24d310b6IQc7MZQqSpJhaPo-7MwCt_Ssg/edit?usp=drive_web&tab=t.qx6pwv8xqi3h)

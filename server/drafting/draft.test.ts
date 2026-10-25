import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPayload } from "./narrative.js";
import { runDraft } from "./index.js";
import type { DraftResponse } from "./types.js";

const studio = { name: "Demo Dance", address: "1 Example St", city: "Bellevue", state: "WA", phone: "425-555-0100", email: "hi@demo.example", website: "https://demo.example", description: "Friendly adult ballroom studio.", danceStyles: ["Ballroom"], classTypes: ["Group"] };
const jordan = { id: "j", name: "Jordan Rivera", confirmed: true, cprCertified: true, certifications: ["ACE Group Fitness"], requirementAnswers: { adultAttested: true, hasLiabilityInsurance: true } };
const base = { formVersion: "demo-0", studio, studioConfirmed: true, instructor: jordan };
const ans = (r: DraftResponse, id: string) => r.answers.find((a) => a.questionId === id)!;
const noAi = async () => ({ answers: [] });
const ai = (text = "Group ballroom classes at a gentle pace.") => async () => ({ answers: [{ questionId: "demo.class_description", text }] });

test("prefills confirmed facts in code, with stable ids and form version", async () => {
  const r = await runDraft(base, noAi);
  assert.equal(r.formVersion, "demo-0");
  assert.equal(r.isDemo, true);
  assert.equal(ans(r, "demo.studio_name").answer, "Demo Dance");
  assert.equal(ans(r, "demo.studio_name").provenance, "owner_confirmed");
  assert.equal(ans(r, "demo.instructor_name").answer, "Jordan Rivera");
  assert.equal(ans(r, "demo.instructor_cpr").answer, "Yes");
  assert.equal(ans(r, "demo.instructor_adult").answer, "Yes");
  assert.equal(ans(r, "demo.instructor_certifications").answer, "ACE Group Fitness");
  assert.equal(r.answers.length, 17);
});

test("narrative answers are AI drafts flagged for review; only draftable questions get AI text", async () => {
  const r = await runDraft(base, ai());
  assert.equal(ans(r, "demo.class_description").provenance, "ai_draft");
  assert.deepEqual(r.aiDraftedQuestionIds, ["demo.class_description"]);
  assert.equal(ans(r, "demo.studio_name").provenance, "owner_confirmed");
  // Model tries to answer a factual / sensitive question: ignored.
  const r2 = await runDraft(base, async () => ({ answers: [{ questionId: "demo.liability_insurance", text: "Yes" }, { questionId: "demo.tax_id", text: "123" }, { questionId: "demo.class_description", text: "ok" }] }));
  assert.equal(ans(r2, "demo.tax_id").answer, "");
  assert.deepEqual(r2.aiDraftedQuestionIds, ["demo.class_description"]);
});

test("unknown facts are left blank and flagged, never invented", async () => {
  const r = await runDraft({ ...base, instructor: { id: "b", name: "Riley", confirmed: true } }, noAi);
  for (const id of ["demo.instructor_adult", "demo.instructor_cpr", "demo.liability_insurance", "demo.instructor_certifications"]) {
    assert.equal(ans(r, id).answer, "", id);
    assert.equal(ans(r, id).needsInput, true, id);
    assert.ok(r.missingQuestionIds.includes(id), id);
  }
});

test("unconfirmed profile facts are not prefilled", async () => {
  const r = await runDraft({ ...base, studioConfirmed: false, instructor: { ...jordan, confirmed: false } }, noAi);
  assert.equal(ans(r, "demo.studio_name").answer, "");
  assert.equal(ans(r, "demo.instructor_name").answer, "");
  // per-field confirmation via fieldMeta still works
  const r2 = await runDraft({ ...base, studioConfirmed: false, studio: { ...studio, fieldMeta: { name: { provenance: "owner_confirmed" } } } }, noAi);
  assert.equal(ans(r2, "demo.studio_name").answer, "Demo Dance");
  assert.equal(ans(r2, "demo.studio_city").answer, "");
});

test("tax, banking and declarations are left for the provider portal", async () => {
  const r = await runDraft(base, ai());
  assert.deepEqual(r.ownerOnlyQuestionIds.sort(), ["demo.bank_details", "demo.declaration", "demo.tax_id"]);
  for (const id of r.ownerOnlyQuestionIds) assert.equal(ans(r, id).answer, "");
  assert.ok(!r.missingQuestionIds.includes("demo.declaration"));
});

test("owner edits survive re-drafting; explicit regeneration replaces only the listed question", async () => {
  const existing = [
    { questionId: "demo.class_description", answer: "My own wording.", provenance: "owner_edited" as const, needsInput: false },
    { questionId: "demo.studio_phone", answer: "999", provenance: "owner_edited" as const, needsInput: false },
  ];
  const kept = await runDraft({ ...base, existingAnswers: existing }, ai("NEW AI TEXT"));
  assert.equal(ans(kept, "demo.class_description").answer, "My own wording.");
  assert.equal(ans(kept, "demo.class_description").provenance, "owner_edited");
  assert.equal(ans(kept, "demo.studio_phone").answer, "999");
  assert.deepEqual(kept.aiDraftedQuestionIds, []);
  const regen = await runDraft({ ...base, existingAnswers: existing, regenerateQuestionIds: ["demo.class_description"] }, ai("NEW AI TEXT"));
  assert.equal(ans(regen, "demo.class_description").answer, "NEW AI TEXT");
  assert.equal(ans(regen, "demo.studio_phone").answer, "999"); // not listed: still preserved
});

test("existing AI drafts are not re-generated (no Claude call) unless requested", async () => {
  let calls = 0;
  const existing = [{ questionId: "demo.class_description", answer: "Earlier draft", provenance: "ai_draft" as const, needsInput: false }];
  const r = await runDraft({ ...base, existingAnswers: existing }, async () => { calls++; return { answers: [] }; });
  assert.equal(ans(r, "demo.class_description").answer, "Earlier draft");
  assert.equal(calls, 0);
});

test("without confirmed narrative facts Claude is not called and the answer stays blank", async () => {
  let calls = 0;
  const r = await runDraft({ ...base, studio: { name: "Demo Dance" }, instructor: { id: "x", name: "X", confirmed: true } }, async () => { calls++; return { answers: [{ questionId: "demo.class_description", text: "Invented" }] }; });
  assert.equal(calls, 0);
  assert.equal(ans(r, "demo.class_description").answer, "");
  assert.ok(r.warnings.some((w) => w.includes("Not enough confirmed information")));
});

test("Claude failure keeps prefilled answers and reports a warning", async () => {
  const r = await runDraft(base, async () => { throw new Error("down"); });
  assert.equal(ans(r, "demo.studio_name").answer, "Demo Dance");
  assert.equal(ans(r, "demo.class_description").answer, "");
  assert.ok(r.warnings.some((w) => w.includes("couldn't generate")));
  const bad = await runDraft(base, async () => ({ nope: true }));
  assert.equal(ans(bad, "demo.class_description").answer, "");
});

test("instructor drafts do not mix and no names or contacts reach Claude", async () => {
  const seen: string[] = [];
  const spy = async (p: string) => { seen.push(p); return { answers: [] }; };
  const a = await runDraft(base, spy);
  const b = await runDraft({ ...base, instructor: { id: "b", name: "Riley Sample", confirmed: true, certifications: ["Zumba Gold"] } }, spy);
  assert.equal(a.instructorId, "j");
  assert.equal(b.instructorId, "b");
  assert.equal(ans(a, "demo.instructor_certifications").answer, "ACE Group Fitness");
  assert.equal(ans(b, "demo.instructor_certifications").answer, "Zumba Gold");
  assert.equal(ans(b, "demo.instructor_cpr").answer, ""); // Jordan's CPR does not leak to Riley
  assert.ok(seen.every((p) => !/Jordan|Riley|425-555|hi@demo|example\.com/.test(p)));
  assert.ok(!seen[0].includes("Zumba") && seen[1].includes("Zumba"));
});

test("payload builder is limited to facts and question wording", () => {
  const p = buildPayload({ studioDescription: "x" }, []);
  assert.ok(p.startsWith("<facts>") && p.includes("<questions>"));
});

test("invalid input and unknown provider are rejected", async () => {
  await assert.rejects(runDraft({ studio: {} }));
  await assert.rejects(runDraft({ ...base, providerId: "nope" }));
});

// ---------- real studio-level forms (Forma Google Form, FitOn HubSpot form) ----------
const acme = { name: "Demo Dance", website: "https://demo.example", contactName: "Sam Q Example", email: "sam@demo.example", phone: "425-555-0100", address: "1 Example St", city: "Bellevue", state: "WA", description: "Friendly adult ballroom studio.", schedulingPlatform: "Mindbody" };

test("Forma: studio-level form needs no instructor, prefills from confirmed profile and builds a Google prefill link", async () => {
  const r = await runDraft({ providerId: "forma", studio: acme, studioConfirmed: true }, noAi);
  assert.equal(r.applicantType, "studio");
  assert.equal(r.instructorId, null);
  assert.equal(ans(r, "forma.company_name").answer, "Demo Dance");
  assert.equal(ans(r, "forma.partner_contact_email").answer, "sam@demo.example");
  assert.equal(ans(r, "forma.intent").answer, ""); // owner choice, never inferred
  assert.equal(ans(r, "forma.location_availability").answer, "");
  assert.ok(r.missingQuestionIds.includes("forma.intent") && r.missingQuestionIds.includes("forma.location_availability"));
  const u = new URL(r.prefillUrl!);
  assert.equal(u.origin + u.pathname, "https://docs.google.com/forms/d/e/1FAIpQLSfZ2MIqhMc6kgnPQw0Hio3uMyuK6lLHqPIWTlT9hSf1zC4xtQ/viewform");
  assert.equal(u.searchParams.get("usp"), "pp_url");
  assert.equal(u.searchParams.get("entry.884396131"), "Demo Dance");
  assert.equal(u.searchParams.get("entry.1401174214"), "sam@demo.example");
  assert.equal(u.searchParams.get("entry.1364368139"), null); // blank answers are not in the link
});

test("Forma: nothing confirmed means no prefill link; instructor data never reaches studio forms", async () => {
  const r = await runDraft({ providerId: "forma", studio: acme, studioConfirmed: false, instructor: jordan }, noAi);
  assert.equal(r.prefillUrl, null);
  assert.equal(r.instructorId, null);
});

test("FitOn: name is split in code, state must match a listed option, owner-only fields stay blank", async () => {
  const r = await runDraft({ providerId: "fiton", studio: acme, studioConfirmed: true }, noAi);
  assert.equal(ans(r, "fiton.firstname").answer, "Sam");
  assert.equal(ans(r, "fiton.lastname").answer, "Q Example");
  assert.equal(ans(r, "fiton.state").answer, "WA");
  assert.equal(ans(r, "fiton.about_facility").answer, "Friendly adult ballroom studio."); // from confirmed description, no AI
  assert.equal(ans(r, "fiton.facility_scheduling_service").answer, "Mindbody");
  for (const id of ["fiton.fitness_facility_type", "fiton.membership_retail_rate", "fiton.membership_access_includes"]) {
    assert.equal(ans(r, id).answer, "", id);
    assert.ok(r.missingQuestionIds.includes(id), id);
  }
  assert.equal(r.prefillUrl, null); // HubSpot form: copy-assist only
  const bad = await runDraft({ providerId: "fiton", studio: { ...acme, state: "Washington" }, studioConfirmed: true }, noAi);
  assert.equal(ans(bad, "fiton.state").answer, ""); // not one of the options: left for the owner
  assert.ok(bad.missingQuestionIds.includes("fiton.state"));
});

test("FitOn: blank description is drafted by AI only from other confirmed facts", async () => {
  let calls = 0;
  const r = await runDraft({ providerId: "fiton", studio: { ...acme, description: undefined, danceStyles: ["Ballroom"] }, studioConfirmed: true }, async () => { calls++; return { answers: [{ questionId: "fiton.about_facility", text: "A ballroom studio." }] }; });
  assert.equal(calls, 1);
  assert.equal(ans(r, "fiton.about_facility").provenance, "ai_draft");
  assert.deepEqual(r.aiDraftedQuestionIds, ["fiton.about_facility"]);
});

test("instructor-level forms require an instructor; unknown providers rejected; forms are listed", async () => {
  await assert.rejects(runDraft({ providerId: "silversneakers", studio: acme, studioConfirmed: true }), /instructor/);
  await assert.rejects(runDraft({ providerId: "nope", studio: acme }));
  const { listForms } = await import("./index.js");
  assert.deepEqual(listForms().map((f) => f.providerId).sort(), ["fiton", "forma", "silversneakers"]);
});

test("Forma prefill link omits unreviewed AI drafts but includes owner-edited answers", async () => {
  const edited = [{ questionId: "forma.questions_for_team", answer: "Do you list studios?", provenance: "owner_edited" as const, needsInput: false }];
  const r = await runDraft({ providerId: "forma", studio: acme, studioConfirmed: true, existingAnswers: edited }, noAi);
  assert.equal(new URL(r.prefillUrl!).searchParams.get("entry.958383559"), "Do you list studios?");
  const ai = [{ questionId: "forma.company_name", answer: "AI Name", provenance: "ai_draft" as const, needsInput: false }];
  const r2 = await runDraft({ providerId: "forma", studio: acme, studioConfirmed: true, existingAnswers: ai }, noAi);
  assert.equal(new URL(r2.prefillUrl!).searchParams.get("entry.884396131"), null);
});

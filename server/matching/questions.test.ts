import assert from "node:assert/strict";
import { test } from "node:test";
import { runDraft } from "../drafting/index.js";
import { QuestionsInputError, runQuestions, type QuestionsResponse } from "./questions.js";

const studio = { name: "Demo Dance", city: "Bellevue", state: "WA", address: "1 Example St", phone: "425-555-0100", email: "hi@demo.example", contactName: "Sam Q Example", website: "https://demo.example", classTypes: ["Group"], description: "Friendly studio." };
const bare = { id: "a", name: "Alex" }; // nothing known about Alex
const sure = { id: "b", name: "Bea", confirmed: true, cprCertified: true, requirementAnswers: { adultAttested: true } };
const q = (body: object): QuestionsResponse => runQuestions({ studio, studioConfirmed: true, ...body });
const ids = (r: QuestionsResponse) => r.questions.map((x) => x.field);

test("FLEX: an instructor must be selected or added first; studio details are not enough", () => {
  const r = q({ providerId: "silversneakers", instructors: [bare, sure] });
  assert.equal(r.instructorSelection.required, true);
  assert.equal(r.instructorSelection.selectedId, null);
  assert.deepEqual(r.instructorSelection.options.map((o) => o.id), ["a", "b"]);
  assert.equal(r.questions.length, 0);
  assert.equal(r.done, false);
  assert.equal(r.readiness?.fitLabel, "More information needed");
  const none = q({ providerId: "silversneakers", instructors: [] });
  assert.equal(none.instructorSelection.canAdd, true);
  assert.deepEqual(none.instructorSelection.options, []);
});

test("FLEX: asks only unknown application-stage details, each with a reason; never onboarding items", () => {
  const r = q({ providerId: "silversneakers", instructors: [bare], instructorId: "a" });
  const elig = r.questions.filter((x) => x.source === "requirement").map((x) => x.field).sort();
  assert.deepEqual(elig, ["instructor.cprCertified", "instructor.requirementAnswers.adultAttested", "instructor.requirementAnswers.hasLiabilityInsurance", "instructor.requirementAnswers.hasTeachingCertification"].sort());
  // the (demo) form also needs the certification names themselves
  assert.ok(r.questions.some((x) => x.source === "form" && x.field === "instructor.certifications"));
  assert.equal(r.form?.isDemo, true);
  assert.ok(r.questions.every((x) => x.why.length > 20));
  assert.ok(r.questions.filter((x) => x.source === "requirement").every((x) => x.label.endsWith("?")));
  assert.ok(!r.questions.some((x) => /contract|training|W-9|background/i.test(x.label)));
  assert.ok(r.questions.some((x) => x.why.includes("never a birth date")));
});

test("already-confirmed information is skipped but listed so it can be corrected", () => {
  const r = q({ providerId: "silversneakers", instructors: [sure], instructorId: "b" });
  assert.ok(!ids(r).includes("instructor.cprCertified") && !ids(r).includes("instructor.requirementAnswers.adultAttested"));
  const cpr = r.confirmed.find((c) => c.field === "instructor.cprCertified")!;
  assert.equal(cpr.value, true);
  assert.equal(cpr.basis, "owner_confirmed");
  assert.equal(cpr.editable, true);
});

test("a new instructor can be added on the spot", () => {
  const r = q({ providerId: "silversneakers", instructors: [bare], newInstructor: { name: "Cam New" } });
  assert.match(r.instructorSelection.selectedId!, /^new-/);
  assert.equal(r.instructors.length, 2);
  assert.equal(r.instructors[1].name, "Cam New");
  assert.equal(r.questions.filter((x) => x.source === "requirement").length, 4);
});

test("readiness is re-evaluated after answers; corrections change it; unknowns are preserved, not guessed", () => {
  const base = { providerId: "silversneakers", instructors: [bare], instructorId: "a" };
  const all = (v: boolean) => [
    { field: "instructor.requirementAnswers.adultAttested", value: v }, { field: "instructor.cprCertified", value: v },
    { field: "instructor.requirementAnswers.hasTeachingCertification", value: v }, { field: "instructor.requirementAnswers.hasLiabilityInsurance", value: v },
  ];
  const ok = q({ ...base, answers: all(true) });
  assert.equal(ok.readiness?.fitLabel, "Potential fit");
  assert.equal(ok.questions.filter((x) => x.source === "requirement").length, 0); // eligibility questions all answered
  assert.deepEqual(ok.questions.map((x) => x.field), ["instructor.certifications"]); // form still needs the certification names
  assert.equal(ok.done, false);
  const named = q({ ...base, answers: [...all(true), { field: "instructor.certifications", value: "ACE Group Fitness, CPR/AED" }] });
  assert.equal(named.done, true);
  assert.deepEqual(named.instructors[0].certifications, ["ACE Group Fitness", "CPR/AED"]);
  assert.equal(ok.readiness?.eligibilityConfirmed, false);
  // correction: CPR was yes, now no
  const fixed = q({ ...base, answers: [...all(true), { field: "instructor.cprCertified", value: "no" }] });
  assert.equal(fixed.readiness?.fitLabel, "Known requirement not met");
  assert.deepEqual(fixed.readiness?.blockers, ["CPR certification"]);
  assert.equal(fixed.confirmed.find((c) => c.field === "instructor.cprCertified")?.result, "not_met");
  // "I don't know": nothing written, never turned into a failure, not re-asked
  const unk = q({ ...base, answers: [{ field: "instructor.cprCertified", value: "unknown" }, { field: "instructor.requirementAnswers.adultAttested", value: null }] });
  assert.deepEqual(unk.unknownFields.sort(), ["instructor.cprCertified", "instructor.requirementAnswers.adultAttested"]);
  assert.equal(unk.instructors[0].cprCertified, undefined);
  assert.equal(unk.readiness?.fitLabel, "More information needed");
  assert.ok(!ids(unk).includes("instructor.cprCertified"));
});

test("answers for one instructor never change another", () => {
  const r = q({ providerId: "silversneakers", instructors: [bare, { ...bare, id: "c", name: "Cy" }], instructorId: "a", answers: [{ field: "instructor.cprCertified", value: true }] });
  assert.equal(r.instructors.find((i) => i.id === "a")!.cprCertified, true);
  assert.equal(r.instructors.find((i) => i.id === "c")!.cprCertified, undefined);
});

test("ClassPass and Wellhub: studio questions from requirements, skipping what is confirmed", () => {
  const cp = q({ providerId: "classpass" });
  assert.equal(cp.questions.length, 0);
  assert.equal(cp.instructorSelection.required, false);
  assert.equal(cp.readiness?.fitLabel, "Potential fit");
  const wh = q({ providerId: "wellhub", studio: { name: "Demo Dance", address: "1 Example St" } });
  assert.deepEqual(ids(wh).sort(), ["studio.googleBusinessProfileVerified", "studio.hasPriceList", "studio.phone"].sort());
  const after = q({ providerId: "wellhub", studio: { name: "Demo Dance", address: "1 Example St" }, answers: [{ field: "studio.phone", value: "425-555-0100" }, { field: "studio.googleBusinessProfileVerified", value: "yes" }, { field: "studio.hasPriceList", value: true }] });
  assert.equal(after.done, true);
  assert.equal(after.readiness?.fitLabel, "Potential fit");
  assert.equal(after.studio.phone, "425-555-0100");
});

test("Forma: asks only owner-choice questions; answers feed /api/draft as owner-edited answers", async () => {
  const r = q({ providerId: "forma" });
  assert.equal(r.readiness?.fitLabel, "Potential fit");
  assert.deepEqual(ids(r).sort(), ["application.forma.intent", "application.forma.location_availability"].sort());
  assert.ok(r.confirmed.some((c) => c.field === "studio.name"));
  const a = q({ providerId: "forma", answers: [{ field: "application.forma.intent", value: "I'm interested in the partnership opportunity with Forma." }, { field: "application.forma.location_availability", value: "Worldwide" }] });
  assert.equal(a.done, true);
  assert.equal(a.existingAnswers.length, 2);
  const draft = await runDraft({ providerId: "forma", studio, studioConfirmed: true, existingAnswers: a.existingAnswers }, async () => ({ answers: [] }));
  assert.equal(draft.answers.find((x) => x.questionId === "forma.intent")!.answer, "I'm interested in the partnership opportunity with Forma.");
  assert.equal(draft.missingQuestionIds.length, 0);
});

test("FitOn: website-extracted facts are confirmed rather than re-asked; owner-only details are asked", () => {
  const extracted = { name: "Demo Dance", email: "hi@demo.example", contactName: "Sam Q", website: "https://demo.example", address: "1 Example St", city: "Bellevue", state: "WA", fieldMeta: { name: { provenance: "ai_draft" }, email: { provenance: "ai_draft" } } };
  const r = runQuestions({ providerId: "fiton", studio: extracted, studioConfirmed: false });
  const names = r.confirmed.filter((c) => c.needsConfirmation).map((c) => c.field);
  assert.ok(names.includes("studio.name") && names.includes("studio.email"));
  assert.ok(!ids(r).includes("studio.name") && !ids(r).includes("studio.email"));
  assert.ok(ids(r).includes("application.fiton.fitness_facility_type") && ids(r).includes("application.fiton.membership_retail_rate"));
  assert.ok(ids(r).includes("studio.phone")); // mobile phone is genuinely missing
  assert.equal(r.questions.find((x) => x.field === "application.fiton.fitness_facility_type")!.options?.includes("Boutique Fitness Studio"), true);
});

test("tax, banking and declarations are never asked", () => {
  for (const id of ["fiton", "silversneakers"]) {
    const r = q({ providerId: id, instructors: [bare], instructorId: "a" });
    assert.ok(!r.questions.some((x) => /tax|bank|certify|deposit/i.test(x.label)), id);
  }
});

test("unsafe or invalid input is rejected", () => {
  const bad = (body: object) => assert.throws(() => q(body), QuestionsInputError);
  bad({ providerId: "nope" });
  bad({ providerId: "wellhub", answers: [{ field: "studio.__proto__", value: "x" }] });
  bad({ providerId: "wellhub", answers: [{ field: "studio.notAField", value: "x" }] });
  bad({ providerId: "wellhub", answers: [{ field: "studio.hasPriceList", value: "maybe" }] });
  bad({ providerId: "silversneakers", instructors: [bare], answers: [{ field: "instructor.cprCertified", value: true }] }); // no instructor selected
  bad({ providerId: "silversneakers", instructors: [bare], instructorId: "a", answers: [{ field: "instructor.requirementAnswers.__proto__", value: true }] });
  assert.throws(() => runQuestions({ providerId: "x".repeat(70) }), QuestionsInputError);
});

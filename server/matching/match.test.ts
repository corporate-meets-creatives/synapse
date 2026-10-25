import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateAll } from "./evaluate.js";
import { buildPayload, explain, keyOf } from "./explain.js";
import { runMatch } from "./index.js";
import { MatchRequest, type MatchEntry } from "./types.js";

const studio = { name: "Demo Dance", city: "Bellevue", state: "WA", phone: "425-555-0100", address: "1 Example St", classTypes: ["Group"] };
const req = (instructors: unknown[], s: unknown = studio) => MatchRequest.parse({ studio: s, instructors });
const flex = (ms: MatchEntry[], id: string) => ms.find((m) => m.providerId === "silversneakers" && m.instructorId === id)!;
const result = (m: MatchEntry, id: string) => m.requirementResults.find((r) => r.requirementId === id)?.result;

const complete = { id: "a", name: "A", cprCertified: true, certifications: ["ACE Group Fitness"], requirementAnswers: { adultAttested: true, hasLiabilityInsurance: true } };

test("catalog has the three providers; ClassPass/Wellhub are external links only", () => {
  const ms = evaluateAll(req([complete]));
  assert.deepEqual([...new Set(ms.map((m) => m.providerId))].sort(), ["classpass", "silversneakers", "wellhub"]);
  for (const id of ["classpass", "wellhub"]) {
    const m = ms.find((x) => x.providerId === id)!;
    assert.equal(m.workflowMode, "external_link");
    assert.ok(m.externalUrl?.startsWith("https://"));
    assert.equal(m.applicationUrlVerified, false);
  }
  assert.equal(flex(ms, "a").externalUrl, null);
});

test("unknown requirements stay unknown (never not_met)", () => {
  const m = flex(evaluateAll(req([{ id: "b", name: "B" }])), "b");
  for (const id of ["flex.adult_attested", "flex.cpr_certified", "flex.teaching_certification", "flex.liability_insurance"]) assert.equal(result(m, id), "unknown", id);
  assert.deepEqual(m.blockers, []);
  assert.equal(m.readiness, "missing_items");
});

test("known false is not_met; hard blocker (under 18) gives not_a_fit; missing CPR is only missing_items", () => {
  const minor = flex(evaluateAll(req([{ ...complete, id: "m", requirementAnswers: { adultAttested: false } }])), "m");
  assert.equal(result(minor, "flex.adult_attested"), "not_met");
  assert.equal(minor.readiness, "not_a_fit");
  const noCpr = flex(evaluateAll(req([{ ...complete, id: "c", cprCertified: false }])), "c");
  assert.equal(result(noCpr, "flex.cpr_certified"), "not_met");
  assert.equal(noCpr.readiness, "missing_items");
  assert.deepEqual(noCpr.blockers, ["CPR certification"]);
});

test("onboarding requirements never block starting an application", () => {
  const m = flex(evaluateAll(req([complete])), "a"); // training/contract/W-9 all unknown
  assert.equal(m.readiness, "ready");
  assert.deepEqual(m.missingToApply, []);
  assert.ok(m.missingBeforeTeaching.includes("Approved FLEX contract"));
  assert.ok(m.requirementResults.filter((r) => r.stage === "onboarding").every((r) => r.result === "unknown"));
  // even a known-false contract / training does not block
  const m2 = flex(evaluateAll(req([{ ...complete, requirementAnswers: { ...complete.requirementAnswers, flexContractApproved: false, foundationsTrainingDone: false } }])), "a");
  assert.equal(m2.readiness, "ready");
  assert.equal(result(m2, "flex.contract_approved"), "not_met");
});

test("each instructor is evaluated separately; answers do not mix", () => {
  const ms = evaluateAll(req([complete, { id: "b", name: "B" }]));
  assert.equal(flex(ms, "a").readiness, "ready");
  assert.equal(flex(ms, "b").readiness, "missing_items");
  assert.equal(result(flex(ms, "b"), "flex.cpr_certified"), "unknown");
  assert.equal(ms.filter((m) => m.providerId === "silversneakers").length, 2);
});

test("liability insurance: studio-level yes counts; both missing is unknown; explicit no is not_met", () => {
  const i = { id: "x", name: "X" };
  assert.equal(result(flex(evaluateAll(req([i], { ...studio, hasLiabilityInsurance: true })), "x"), "flex.liability_insurance"), "met");
  assert.equal(result(flex(evaluateAll(req([i])), "x"), "flex.liability_insurance"), "unknown");
  const no = { ...i, requirementAnswers: { hasLiabilityInsurance: false } };
  assert.equal(result(flex(evaluateAll(req([no], { ...studio, hasLiabilityInsurance: false })), "x"), "flex.liability_insurance"), "not_met");
});

test("signature-class specialty certification only applies when the instructor teaches signature classes", () => {
  const plain = flex(evaluateAll(req([complete])), "a");
  assert.equal(result(plain, "flex.signature_specialty_cert"), undefined);
  const sig = { ...complete, requirementAnswers: { ...complete.requirementAnswers, teachesSignatureClasses: true } };
  assert.equal(result(flex(evaluateAll(req([sig])), "a"), "flex.signature_specialty_cert"), "unknown");
  const sigNo = { ...complete, requirementAnswers: { ...complete.requirementAnswers, teachesSignatureClasses: true, hasSpecialtyCertification: false } };
  assert.equal(result(flex(evaluateAll(req([sigNo])), "a"), "flex.signature_specialty_cert"), "not_met");
});

test("external providers list missing studio info and never claim eligibility", () => {
  const ms = evaluateAll(req([], { name: "Demo Dance" }));
  const w = ms.find((m) => m.providerId === "wellhub")!;
  assert.ok(w.missingToApply.includes("Business phone number"));
  assert.ok(w.missingToApply.includes("Verified Google Business Profile")); // unknown, not failed
  assert.deepEqual(w.blockers, []);
  assert.match(w.explanation, /can't confirm/i);
});

test("with no instructors, FLEX still returns one studio-level card", () => {
  const ms = evaluateAll(req([]));
  assert.equal(ms.filter((m) => m.providerId === "silversneakers").length, 1);
});

test("Claude explains but cannot change computed results; payload has no names or contacts", async () => {
  const base = evaluateAll(req([{ ...complete, name: "Secret Name" }]));
  const payload = buildPayload(base);
  assert.ok(!payload.includes("Secret Name") && !payload.includes("425-555") && !payload.includes("Bellevue"));
  const fx = flex(base, "a");
  const out = await explain(base, async () => ({
    explanations: [{ key: keyOf(fx), text: "Ready to start." }],
    readiness: "not_a_fit", // ignored extra
  }));
  const m = flex(out, "a");
  assert.equal(m.explanation, "Ready to start.");
  assert.equal(m.explanationSource, "ai");
  assert.equal(m.readiness, fx.readiness);
  assert.deepEqual(m.requirementResults, fx.requirementResults);
});

test("Claude failure or bad output falls back to deterministic text; external overclaims rejected", async () => {
  const base = evaluateAll(req([complete]));
  for (const call of [async () => { throw new Error("down"); }, async () => ({ nope: 1 })]) {
    const out = await explain(base, call);
    assert.ok(out.every((m) => m.explanationSource === "deterministic_fallback" && m.explanation.length > 0));
  }
  const cp = base.find((m) => m.providerId === "classpass")!;
  const out = await explain(base, async () => ({ explanations: [{ key: keyOf(cp), text: "You are eligible and approved!" }] }));
  assert.equal(out.find((m) => m.providerId === "classpass")!.explanationSource, "deterministic_fallback");
});

test("runMatch rejects malformed input", async () => {
  await assert.rejects(runMatch({ studio: "x" }));
  await assert.rejects(runMatch({ studio: {}, instructors: [{ name: "no id" }] }));
});

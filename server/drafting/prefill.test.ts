import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { getForm, runDraft } from "./index.js";
import { _clearPrefillCache, buildPrefill, isAllowedFormUrl, parseEntryIds, verifyFormStructure } from "./prefill.js";
import type { AnswerField } from "./types.js";

const forma = getForm("forma");
const studio = { name: "Demo Dance", website: "https://demo.example", contactName: "Sam Q", email: "sam@demo.example" };
const entryIds = forma.structureSnapshot!.entryIds!;

/** A fake public Google Form page containing the given entry ids. */
const page = (ids: string[]) => `<script>var FB_PUBLIC_LOAD_DATA_ = ${JSON.stringify([null, [null, ids.map((id, i) => [i, "q", null, 0, [[Number(id.replace("entry.", "")), null, 1]]])]])};</script>`;
const live = (ids: string[]) => async () => page(ids);

beforeEach(() => _clearPrefillCache());

test("pre-fill links are only built for the official Google Forms host", () => {
  assert.equal(isAllowedFormUrl(forma.formUrl), true);
  for (const u of ["https://evil.example/forms/d/e/x/viewform", "http://docs.google.com/forms/d/e/x", "https://docs.google.com/document/d/x", "https://docs.google.com.evil.example/forms/x", "not a url"]) assert.equal(isAllowedFormUrl(u), false, u);
  const hijacked = { ...forma, formUrl: "https://evil.example/forms/d/e/x/viewform" };
  const ans: AnswerField[] = [{ questionId: "forma.company_name", answer: "Demo", provenance: "owner_confirmed", needsInput: false }];
  assert.equal(buildPrefill(hijacked, ans).url, null);
});

test("fill report lists filled, skipped (with reason) and failed answers", () => {
  const A = (questionId: string, answer: string, provenance: AnswerField["provenance"] = "owner_confirmed"): AnswerField => ({ questionId, answer, provenance, needsInput: false });
  const r = buildPrefill(forma, [
    A("forma.company_name", "Demo Dance"),
    A("forma.my_email", "sam@demo.example", "owner_edited"),
    A("forma.questions_for_team", "AI wrote this", "ai_draft"), // not reviewed
    A("forma.location_availability", "Mars"), // not one of the options
    A("forma.intent", ""), // blank
  ]);
  assert.deepEqual(r.filled.map((x) => x.questionId), ["forma.my_email", "forma.company_name"]);
  assert.equal(r.skipped.find((x) => x.questionId === "forma.questions_for_team")!.reason, "unreviewed_ai_draft");
  assert.equal(r.skipped.find((x) => x.questionId === "forma.intent")!.reason, "blank");
  assert.deepEqual(r.failed, [{ questionId: "forma.location_availability", label: "Product Location Availability", reason: "not_an_option" }]);
  assert.ok(!r.url!.includes("Mars") && !r.url!.includes("AI+wrote"));
});

test("sensitive and declaration questions are always reported as portal-only", () => {
  const fiton = getForm("fiton");
  const r = buildPrefill(fiton, []);
  assert.equal(r.url, null); // copy-assist form: no link
  const flex = getForm("silversneakers");
  const rf = buildPrefill(flex, []);
  assert.deepEqual(rf.skipped.filter((x) => x.reason === "portal_only").map((x) => x.questionId).sort(), ["demo.bank_details", "demo.declaration", "demo.tax_id"]);
});

test("parseEntryIds reads question ids from a Google Form page and rejects other pages", () => {
  assert.deepEqual(parseEntryIds(page(["entry.1", "entry.22"])), ["entry.1", "entry.22"]);
  assert.equal(parseEntryIds("<html>login required</html>"), null);
});

test("unchanged form: link offered (status ok)", async () => {
  const r = await runDraft({ providerId: "forma", studio, studioConfirmed: true, verifyForm: true }, undefined, live(entryIds));
  assert.equal(r.prefill?.status, "ok");
  assert.ok(r.prefillUrl && r.prefill?.checkedAt);
  assert.ok(r.prefill!.filled.length >= 5);
});

test("changed form (question added or removed): no link, with a clear message", async () => {
  for (const ids of [[...entryIds, "entry.999"], entryIds.slice(1)]) {
    _clearPrefillCache();
    const r = await runDraft({ providerId: "forma", studio, studioConfirmed: true, verifyForm: true }, undefined, live(ids));
    assert.equal(r.prefill?.status, "form_changed");
    assert.equal(r.prefillUrl, null);
    assert.match(r.prefill!.message!, /copy your answers/i);
    assert.ok(r.answers.find((a) => a.questionId === "forma.company_name")!.answer); // answers themselves are untouched
  }
});

test("login wall / unreadable form or network failure: status unverified, never reported as changed", async () => {
  const wall = await runDraft({ providerId: "forma", studio, studioConfirmed: true, verifyForm: true }, undefined, async () => "<html>Sign in</html>");
  assert.equal(wall.prefill?.status, "unverified");
  assert.ok(wall.prefillUrl); // link still offered, with a caution message
  assert.match(wall.prefill!.message!, /couldn't confirm/i);
  _clearPrefillCache();
  const down = await runDraft({ providerId: "forma", studio, studioConfirmed: true, verifyForm: true }, undefined, async () => { throw new Error("offline"); });
  assert.equal(down.prefill?.status, "unverified");
});

test("the form is only fetched when verification is requested, and results are cached", async () => {
  let fetches = 0;
  const f = async () => (fetches++, page(entryIds));
  await runDraft({ providerId: "forma", studio, studioConfirmed: true }, undefined, f);
  assert.equal(fetches, 0);
  await verifyFormStructure(forma, f);
  await verifyFormStructure(forma, f);
  assert.equal(fetches, 1);
});

test("nothing to fill means no link and no claim of a pre-fill", async () => {
  const r = await runDraft({ providerId: "forma", studio: {}, studioConfirmed: false, verifyForm: true }, undefined, live(entryIds));
  assert.equal(r.prefillUrl, null);
  assert.equal(r.prefill?.status, "not_supported");
  assert.equal(r.prefill?.filled.length, 0);
});

test("copy-assist forms have no pre-fill block", async () => {
  const r = await runDraft({ providerId: "fiton", studio, studioConfirmed: true, verifyForm: true });
  assert.equal(r.prefill, null);
  assert.equal(r.prefillUrl, null);
});

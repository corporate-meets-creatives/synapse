import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
const Core = createRequire(import.meta.url)("./core.js");

const NAMES = ["firstname", "lastname", "email", "mobilephone", "company", "fitness_facility_type", "website", "about_facility", "address", "city", "state", "facility_scheduling_service", "membership_retail_rate", "membership_access_includes"];
const packet = (over = {}) => ({
  v: 1, providerId: "fiton", adapter: "hubspot", site: { origin: "https://www.fitonhealth.com", pathPrefix: "/facilities" }, expectedFields: NAMES,
  fields: [
    { questionId: "q1", label: "First Name", target: "firstname", value: "Sam" },
    { questionId: "q2", label: "Email", target: "email", value: "sam@demo.example" },
    { questionId: "q3", label: "State/Region", target: "state", value: "WA" },
    { questionId: "q4", label: "Monthly Membership Retail Rate", target: "membership_retail_rate", value: "89" },
  ], ...over,
});
const field = (name, type = "text", extra = {}) => ({ name, type, tag: type === "select-one" ? "select" : "input", disabled: false, readOnly: false, visible: true, options: [], ...extra });
const page = (over = {}) => ({
  origin: "https://www.fitonhealth.com", pathname: "/facilities", loginWall: false, captchaChallenge: false,
  fields: [...NAMES.map((n) => (n === "state" ? field(n, "select-one", { options: [{ value: "", text: "Please Select" }, { value: "WA", text: "WA" }, { value: "IL", text: "IL" }] }) : n === "membership_retail_rate" ? field(n, "number") : field(n))), field("hs_context", "hidden", { visible: false }), field("", "submit")],
  ...over,
});

test("a valid packet on the expected page produces fill steps and never a click", () => {
  const plan = Core.planFill(packet(), page());
  assert.equal(plan.stop, null);
  assert.deepEqual(plan.steps.map((s) => s.target), ["firstname", "email", "state", "membership_retail_rate"]);
  assert.ok(plan.steps.every((s) => s.kind === "text" || s.kind === "select"));
  assert.ok(!JSON.stringify(plan).includes("click") && !JSON.stringify(plan).includes("submit"));
});

test("stops on the wrong site or path (allowlist)", () => {
  for (const p of [page({ origin: "https://evil.example" }), page({ pathname: "/careers" }), page({ origin: "https://fitonhealth.com.evil.example" })]) {
    assert.equal(Core.planFill(packet(), p).stop.code, "wrong_site");
  }
  assert.equal(Core.siteAllowed("https://www.fitonhealth.com", "/facilities"), true);
  assert.equal(Core.siteAllowed("http://www.fitonhealth.com", "/facilities"), false);
});

test("packets for other sites or unknown adapters are rejected outright", () => {
  for (const p of [packet({ site: { origin: "https://evil.example", pathPrefix: "/facilities" } }), packet({ site: { origin: "https://www.fitonhealth.com", pathPrefix: "/careers" } }), packet({ adapter: "script" }), packet({ v: 2 }), null, "x"]) {
    assert.equal(Core.validatePacket(p).ok, false);
  }
  assert.equal(Core.planFill(packet({ adapter: "script" }), page()).stop.code, "invalid_packet");
});

test("stops on login walls and CAPTCHA challenges without touching anything", () => {
  assert.equal(Core.planFill(packet(), page({ loginWall: true })).stop.code, "login_required");
  const c = Core.planFill(packet(), page({ captchaChallenge: true }));
  assert.equal(c.stop.code, "captcha");
  assert.equal(c.steps.length, 0);
});

test("stops when the form is missing, has a new field, or lost one (changed structure)", () => {
  assert.equal(Core.planFill(packet(), page({ fields: [] })).stop.code, "form_not_found");
  const extra = Core.planFill(packet(), page({ fields: [...page().fields, field("ssn")] }));
  assert.equal(extra.stop.code, "form_changed");
  assert.deepEqual(extra.stop.unexpected, ["ssn"]);
  const lost = Core.planFill(packet(), page({ fields: page().fields.filter((f) => f.name !== "city") }));
  assert.equal(lost.stop.code, "form_changed");
  assert.deepEqual(lost.stop.missing, ["city"]);
  // a new consent checkbox is an unexpected field too: stop, never tick it
  const consent = Core.planFill(packet(), page({ fields: [...page().fields, field("LEGAL_CONSENT.subscription_type_1", "checkbox")] }));
  assert.equal(consent.stop.code, "form_changed");
});

test("sensitive targets and labels (tax, banking, signature, consent, declaration) are refused", () => {
  for (const [target, label] of [["ssn", "SSN"], ["tax_id", "Tax ID / W-9"], ["bank_details", "Bank"], ["signature", "x"], ["field", "I agree to the terms"], ["declaration", "x"], ["field", "I certify this is accurate"]]) {
    const p = packet({ fields: [{ questionId: "z", label, target, value: "x" }] });
    assert.equal(Core.validatePacket(p).ok, false, `${target}/${label}`);
  }
  assert.equal(Core.isSensitive("Fitness Location(s) Name"), false);
  assert.equal(Core.isSensitive("Street Address"), false);
});

test("selects only accept a listed option; numbers must be numbers; blanks and read-only fields are skipped", () => {
  const bad = packet({ fields: [
    { questionId: "a", label: "State/Region", target: "state", value: "Washington" },
    { questionId: "b", label: "Rate", target: "membership_retail_rate", value: "lots" },
    { questionId: "c", label: "City", target: "city", value: "  " },
    { questionId: "d", label: "Website", target: "website", value: "https://x.example" },
  ] });
  const p = page(); p.fields.find((f) => f.name === "website").readOnly = true;
  const plan = Core.planFill(bad, p);
  assert.deepEqual(plan.steps, []);
  assert.deepEqual(Object.fromEntries(plan.skipped.map((s) => [s.target, s.reason])), { state: "not_an_option", membership_retail_rate: "not_a_number", city: "blank", website: "read_only" });
  // option text works too, and is mapped to the option's value
  const t = Core.planFill(packet({ fields: [{ questionId: "a", label: "State", target: "state", value: "il" }] }), page());
  assert.equal(t.steps[0].value, "IL");
});

test("checkbox/radio/file/password inputs are never filled even if the packet targets them", () => {
  const p = packet({ fields: [{ questionId: "a", label: "Website", target: "website", value: "x" }] });
  const pg = page(); pg.fields.find((f) => f.name === "website").type = "checkbox";
  assert.equal(Core.planFill(p, pg).skipped[0].reason, "unsupported_type");
});

test("oversized or malformed packets are rejected", () => {
  assert.equal(Core.validatePacket(packet({ fields: Array.from({ length: 61 }, (_, i) => ({ questionId: "q" + i, label: "L", target: "t" + i, value: "v" })) })).ok, false);
  assert.equal(Core.validatePacket(packet({ fields: [{ questionId: "a", label: "L", target: "firstname", value: "x".repeat(5001) }] })).ok, false);
  assert.equal(Core.validatePacket(packet({ fields: [{ questionId: "a", label: "L", target: "bad name!", value: "x" }] })).ok, false);
  assert.equal(Core.validatePacket(packet({ expectedFields: [] })).ok, false);
});

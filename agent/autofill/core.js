/*
 * Wellyfish assistant: pure safety and planning logic. No DOM access and no network, so it can be tested in Node.
 * Loaded by the background worker, the bridge and the form script (all must agree on the same rules).
 */
(function (root) {
  "use strict";

  // The only sites the assistant may ever act on, and the page paths allowed on each.
  var ALLOWED_SITES = { "https://www.fitonhealth.com": ["/facilities"] };
  var ADAPTERS = ["hubspot"];
  var MAX_FIELDS = 60;
  var MAX_VALUE = 5000;
  var TTL_MS = 15 * 60 * 1000;

  // Names/labels we never fill: tax, banking, signatures, passwords, consent and declarations.
  var SENSITIVE = /(ssn|social.?sec|\btax|\btin\b|\bein\b|bank|routing|account.?num|iban|password|passwd|credit|card.?num|cvv|signature|\bsign\b|consent|agree|terms|legal|declar|certif)/i;
  // Controls that are never touched: they commit, upload or consent.
  var UNSUPPORTED_TYPES = ["checkbox", "radio", "file", "password", "submit", "button", "image", "reset", "hidden"];

  function isSensitive(s) { return SENSITIVE.test(String(s || "")); }

  function siteAllowed(origin, pathname) {
    var paths = ALLOWED_SITES[origin];
    if (!paths) return false;
    return paths.some(function (p) { return pathname === p || pathname.indexOf(p + "/") === 0 || pathname.indexOf(p) === 0; });
  }

  /** Strict check of a fill packet. Anything unexpected is rejected, never "repaired". */
  function validatePacket(p) {
    var errors = [];
    if (!p || typeof p !== "object") return { ok: false, errors: ["not an object"] };
    if (p.v !== 1) errors.push("unsupported version");
    if (typeof p.providerId !== "string" || !/^[a-z0-9_-]{1,40}$/i.test(p.providerId)) errors.push("bad provider");
    if (ADAPTERS.indexOf(p.adapter) === -1) errors.push("unsupported adapter");
    if (!p.site || !ALLOWED_SITES[p.site.origin]) errors.push("site is not allowlisted");
    else if (!ALLOWED_SITES[p.site.origin].some(function (x) { return p.site.pathPrefix === x; })) errors.push("path is not allowlisted");
    if (!Array.isArray(p.expectedFields) || p.expectedFields.length === 0 || p.expectedFields.length > MAX_FIELDS ||
      !p.expectedFields.every(function (n) { return typeof n === "string" && /^[A-Za-z0-9_]{1,60}$/.test(n); })) errors.push("bad expectedFields");
    if (!Array.isArray(p.fields) || p.fields.length > MAX_FIELDS) errors.push("bad fields");
    else p.fields.forEach(function (f, i) {
      if (!f || typeof f.target !== "string" || !/^[A-Za-z0-9_]{1,60}$/.test(f.target)) errors.push("field " + i + ": bad target");
      else if (isSensitive(f.target) || isSensitive(f.label)) errors.push("field " + i + ": sensitive field refused");
      if (!f || typeof f.value !== "string" || f.value.length > MAX_VALUE) errors.push("field " + i + ": bad value");
      if (f && typeof f.label !== "string") errors.push("field " + i + ": bad label");
    });
    return { ok: errors.length === 0, errors: errors };
  }

  var norm = function (s) { return String(s == null ? "" : s).trim().toLowerCase(); };

  /**
   * Decide what to fill. `page` describes the live page: { origin, pathname, loginWall, captchaChallenge, fields: [{name,type,tag,disabled,readOnly,visible,options:[{value,text}]}] }.
   * Returns { stop, steps, skipped }. A stop means: touch nothing and fall back to copy/paste.
   */
  function planFill(packet, page) {
    var res = { stop: null, steps: [], skipped: [] };
    var v = validatePacket(packet);
    if (!v.ok) { res.stop = { code: "invalid_packet", message: "The answers we were given aren't valid." }; return res; }
    if (page.origin !== packet.site.origin || !siteAllowed(page.origin, page.pathname)) {
      res.stop = { code: "wrong_site", message: "This isn't the official application page, so nothing was filled." }; return res;
    }
    if (page.loginWall) { res.stop = { code: "login_required", message: "This page needs you to log in first. Nothing was filled." }; return res; }
    if (page.captchaChallenge) { res.stop = { code: "captcha", message: "The page is showing a CAPTCHA. Nothing was filled." }; return res; }
    // Visible, named controls. Hidden inputs and the submit button are not part of the form's questions.
    var NON_QUESTION = ["hidden", "submit", "button", "image", "reset"];
    var visible = (page.fields || []).filter(function (f) { return f.name && f.visible && NON_QUESTION.indexOf(f.type) === -1; });
    if (visible.length === 0) { res.stop = { code: "form_not_found", message: "We couldn't find the application form on this page. Nothing was filled." }; return res; }

    var expected = {}; packet.expectedFields.forEach(function (n) { expected[n] = true; });
    var seen = {}; visible.forEach(function (f) { seen[f.name] = f; });
    var unexpected = Object.keys(seen).filter(function (n) { return !expected[n]; });
    var missing = packet.expectedFields.filter(function (n) { return !seen[n]; });
    if (unexpected.length || missing.length) {
      res.stop = { code: "form_changed", message: "The form looks different from the one we prepared for, so nothing was filled.", unexpected: unexpected, missing: missing };
      return res;
    }

    packet.fields.forEach(function (f) {
      var el = seen[f.target];
      var skip = function (reason) { res.skipped.push({ target: f.target, label: f.label, reason: reason }); };
      if (!f.value.trim()) return skip("blank");
      if (!el) return skip("not_on_page");
      if (isSensitive(f.target) || isSensitive(f.label)) return skip("sensitive");
      if (el.disabled || el.readOnly) return skip("read_only");
      if (UNSUPPORTED_TYPES.indexOf(el.type) !== -1) return skip("unsupported_type");
      if (el.tag === "select") {
        var opt = (el.options || []).filter(function (o) { return norm(o.value) === norm(f.value) || norm(o.text) === norm(f.value); })[0];
        if (!opt || opt.value === "") return skip("not_an_option");
        return res.steps.push({ target: f.target, label: f.label, value: opt.value, kind: "select" });
      }
      if (el.type === "number" && !isFinite(Number(f.value))) return skip("not_a_number");
      res.steps.push({ target: f.target, label: f.label, value: f.value, kind: "text" });
    });
    return res;
  }

  var api = { ALLOWED_SITES: ALLOWED_SITES, TTL_MS: TTL_MS, isSensitive: isSensitive, siteAllowed: siteAllowed, validatePacket: validatePacket, planFill: planFill };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.WellyfishCore = api;
})(typeof self !== "undefined" ? self : this);

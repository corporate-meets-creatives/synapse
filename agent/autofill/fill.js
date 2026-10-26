/*
 * Runs on the official application page. If Wellyfish handed over reviewed answers, shows a small panel; fills ONLY when the owner
 * clicks "Fill the form". Never clicks Submit or any button, never ticks consent boxes, and stops if the page isn't what we expect.
 */
(function () {
  "use strict";
  if (window.top !== window) return;
  var Core = self.WellyfishCore;
  var TAG = "wellyfish-assistant";
  if (document.getElementById(TAG)) return;

  var REASONS = {
    blank: "no answer", not_on_page: "not on the form", sensitive: "never filled for you", read_only: "read-only",
    unsupported_type: "you fill this yourself", not_an_option: "not one of the form's choices", not_a_number: "not a number",
  };

  function send(msg) { return new Promise(function (res) { try { chrome.runtime.sendMessage(msg, function (r) { res(r || null); }); } catch (e) { res(null); } }); }

  /** HubSpot renders the form in a same-origin iframe; fall back to the page itself. */
  function formDoc() {
    var frames = document.querySelectorAll("iframe.hs-form-iframe, .hbspt-form iframe");
    for (var i = 0; i < frames.length; i++) {
      try { var d = frames[i].contentDocument; if (d && d.querySelector("form")) return d; } catch (e) { /* cross-origin: not our form */ }
    }
    return document.querySelector("form.hs-form, form[id^='hsForm']") ? document : null;
  }

  function snapshot(doc) {
    var form = doc ? doc.querySelector("form.hs-form, form[id^='hsForm'], form") : null;
    var fields = [];
    if (form) form.querySelectorAll("input,select,textarea").forEach(function (el) {
      var r = el.getBoundingClientRect();
      fields.push({
        name: el.name || "", type: (el.type || "").toLowerCase(), tag: el.tagName.toLowerCase(), disabled: !!el.disabled, readOnly: !!el.readOnly,
        visible: r.width > 0 && r.height > 0,
        options: el.tagName === "SELECT" ? Array.prototype.map.call(el.options, function (o) { return { value: o.value, text: o.text }; }) : [],
      });
    });
    var text = ((doc && doc.body && doc.body.innerText) || "").slice(0, 2000);
    var challenge = !!document.querySelector("iframe[src*='recaptcha/api2/bframe'], iframe[src*='hcaptcha.com/captcha'], .h-captcha iframe, .cf-turnstile iframe");
    var passwordField = !!(doc && doc.querySelector("input[type=password]"));
    return {
      origin: location.origin, pathname: location.pathname, fields: fields, captchaChallenge: challenge,
      loginWall: passwordField || /\b(log ?in|sign ?in) to (continue|apply|view)\b/i.test(text),
    };
  }

  // Set a value the way a person's typing would, so the page's own validation sees it.
  function setValue(el, value) {
    var win = el.ownerDocument.defaultView;
    var proto = el.tagName === "SELECT" ? win.HTMLSelectElement.prototype : el.tagName === "TEXTAREA" ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
    var setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    var fire = function (t) { el.dispatchEvent(new win.Event(t, { bubbles: true })); };
    el.focus && el.focus({ preventScroll: true });
    setter.call(el, value);
    fire("input"); fire("change"); fire("blur"); fire("focusout");
    return el.value === value;
  }

  // ---------- panel (shadow DOM so the page's styles can't touch it) ----------
  var host = null, root = null;
  function panel(html) {
    if (!host) {
      host = document.createElement("div"); host.id = TAG;
      host.style.cssText = "all:initial;position:fixed;right:16px;bottom:16px;z-index:2147483647;";
      root = host.attachShadow({ mode: "closed" });
      document.documentElement.appendChild(host);
    }
    root.innerHTML = '<style>' +
      '.p{font:14px/1.45 system-ui,sans-serif;color:#1b2150;background:#fff;border:1px solid #c9d4f2;border-radius:16px;box-shadow:0 8px 30px rgba(27,33,80,.25);width:340px;max-height:70vh;overflow:auto;padding:16px}' +
      'h2{font-size:16px;margin:0 0 6px}p{margin:6px 0}ul{margin:6px 0;padding-left:18px}button{font:inherit;cursor:pointer;border-radius:999px;padding:8px 16px;border:2px solid #2f5bea;margin:8px 8px 0 0}' +
      '.go{background:#2f5bea;color:#fff}.no{background:#fff;color:#2f5bea}.muted{color:#5b6489;font-size:13px}.bad{color:#a1204f}.ok{color:#0b6f6a}</style><div class="p" role="dialog" aria-label="Wellyfish assistant">' + html + '</div>';
    return root;
  }
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  function offer(packet) {
    var n = packet.fields.filter(function (f) { return f.value.trim(); }).length;
    var r = panel('<h2>Wellyfish assistant</h2><p>Ready to fill <strong>' + n + '</strong> reviewed answers into this form.</p>' +
      '<p class="muted">Nothing is submitted. You check every field, then press Submit yourself. Tax, banking, signatures and consent are never filled.</p>' +
      '<button class="go" id="go">Fill the form</button><button class="no" id="no">Not now</button>');
    r.getElementById("go").onclick = function () { run(packet); };
    r.getElementById("no").onclick = function () { send({ type: "clear" }); host.remove(); host = null; };
  }

  function stopPanel(stop) {
    var extra = "";
    if (stop.unexpected && stop.unexpected.length) extra += '<p class="muted">New on the page: ' + esc(stop.unexpected.join(", ")) + "</p>";
    if (stop.missing && stop.missing.length) extra += '<p class="muted">Missing from the page: ' + esc(stop.missing.join(", ")) + "</p>";
    var r = panel('<h2 class="bad">We stopped</h2><p>' + esc(stop.message) + '</p>' + extra +
      '<p class="muted">Go back to Wellyfish and use the copy buttons for each answer. Your answers are safe there.</p><button class="no" id="close">Close</button>');
    r.getElementById("close").onclick = function () { host.remove(); host = null; };
    send({ type: "clear" });
  }

  function run(packet) {
    var doc = formDoc();
    var plan = Core.planFill(packet, snapshot(doc));
    if (plan.stop) return stopPanel(plan.stop);

    var filled = [], failed = [], first = null;
    var form = doc.querySelector("form.hs-form, form[id^='hsForm'], form");
    plan.steps.forEach(function (s) {
      var el = form.querySelector('[name="' + s.target + '"]');
      if (el && setValue(el, s.value)) {
        filled.push(s); el.style.boxShadow = "0 0 0 3px #12b3a8"; if (!first) first = el;
      } else failed.push(s);
    });
    if (first) first.scrollIntoView({ block: "center", behavior: "smooth" });

    var li = function (a, f) { return a.map(function (x) { return "<li>" + esc(x.label) + (f ? " <span class='muted'>(" + esc(f(x)) + ")</span>" : "") + "</li>"; }).join(""); };
    var left = plan.skipped.filter(function (x) { return x.reason !== "blank"; });
    var blanks = plan.skipped.filter(function (x) { return x.reason === "blank"; });
    var r = panel('<h2 class="ok">Filled ' + filled.length + ' answers</h2>' +
      (failed.length ? '<p class="bad">Couldn\'t fill (' + failed.length + '):</p><ul>' + li(failed) + "</ul>" : "") +
      (left.length || blanks.length ? '<p>Left for you:</p><ul>' + li(left, function (x) { return REASONS[x.reason] || x.reason; }) + li(blanks, function () { return "no answer yet"; }) + "</ul>" : "") +
      '<p class="muted">Review every field, fix anything that looks wrong, complete anything left, then press Submit yourself. Wellyfish never submits for you.</p>' +
      '<button class="no" id="close">Close</button>');
    r.getElementById("close").onclick = function () { host.remove(); host = null; };
    send({ type: "clear" }); // used once
  }

  // Wait (bounded) for the page's form to appear, then offer; if there is nothing pending we never show anything.
  (async function init() {
    var res = await send({ type: "peek" });
    var packet = res && res.packet;
    if (!packet || !Core.validatePacket(packet).ok) return;
    if (!Core.siteAllowed(location.origin, location.pathname) || packet.site.origin !== location.origin) return;
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (formDoc() || tries > 40) { clearInterval(timer); offer(packet); }
    }, 500);
  })();
})();

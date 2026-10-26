/* Holds one pending fill packet in memory-backed session storage (never written to disk) and hands it only to the allowlisted site. */
importScripts("core.js");
var Core = self.WellyfishCore;
var KEY = "wellyfish.pending";

function allowedWellyfishSender(sender) {
  try {
    var u = new URL(sender.tab && sender.tab.url ? sender.tab.url : "");
    return u.origin === "https://wellyfish20.vercel.app" || u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch (e) { return false; }
}

chrome.runtime.onMessage.addListener(function (msg, sender, reply) {
  (async function () {
    if (!msg || typeof msg.type !== "string") return reply({ ok: false });

    if (msg.type === "store") {
      if (!allowedWellyfishSender(sender)) return reply({ ok: false, error: "Not from Wellyfish." });
      var v = Core.validatePacket(msg.packet);
      if (!v.ok) return reply({ ok: false, error: "Rejected: " + v.errors.join("; ") });
      await chrome.storage.session.set({ [KEY]: { packet: msg.packet, expires: Date.now() + Core.TTL_MS } });
      return reply({ ok: true });
    }

    var item = (await chrome.storage.session.get(KEY))[KEY];
    var live = item && item.expires > Date.now() ? item : null;
    if (item && !live) await chrome.storage.session.remove(KEY);

    if (msg.type === "peek") {
      // Only the allowlisted site that the packet names may read it.
      var origin = "";
      try { origin = new URL(sender.tab && sender.tab.url ? sender.tab.url : "").origin; } catch (e) { /* none */ }
      if (live && live.packet.site.origin === origin) return reply({ ok: true, packet: live.packet });
      return reply({ ok: true, packet: null });
    }
    if (msg.type === "clear") { await chrome.storage.session.remove(KEY); return reply({ ok: true }); }
    return reply({ ok: false });
  })();
  return true; // async reply
});

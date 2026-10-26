/* Runs on Wellyfish pages only. Lets the page ask "is the assistant installed?" and hand over a fill packet. */
(function () {
  "use strict";
  var Core = self.WellyfishCore;
  var VERSION = "0.1.0";

  window.addEventListener("message", function (e) {
    // Same window, same origin, our own message shape: nothing else is accepted.
    if (e.source !== window || e.origin !== location.origin) return;
    var d = e.data;
    if (!d || d.source !== "wellyfish-page") return;
    var reply = function (m) { window.postMessage(Object.assign({ source: "wellyfish-extension" }, m), location.origin); };

    if (d.type === "ping") return reply({ type: "pong", version: VERSION });

    if (d.type === "fill-packet") {
      var v = Core.validatePacket(d.packet);
      if (!v.ok) return reply({ type: "stored", ok: false, error: v.errors.join("; "), id: d.id });
      chrome.runtime.sendMessage({ type: "store", packet: d.packet }, function (r) {
        reply({ type: "stored", ok: !!(r && r.ok), error: r && r.error, id: d.id });
      });
    }
  });
})();

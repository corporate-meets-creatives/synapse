# Wellyfish assistant (browser autofill)

A small Chrome extension that types the answers you reviewed in Wellyfish into **one supported application form**.
It runs in *your* browser, on the *official* page, and only does something when you click **Fill the form**.
You check every field and press Submit yourself. It never submits.

## Supported form
| Provider | Page | How |
|---|---|---|
| FitOn Health | `https://www.fitonhealth.com/facilities` | HubSpot form, fields matched by name (`data/forms/fiton.json` → `hubspotField`) |

(Forma uses a pre-filled link instead; see the application screen. Other portals are not supported yet.)

## Install (development)
1. Chrome → `chrome://extensions` → turn on **Developer mode**.
2. **Load unpacked** → choose this folder (`agent/autofill`).
3. The extension only runs on Wellyfish (`wellyfish20.vercel.app`, `localhost`) and on the FitOn page. To use another Wellyfish domain, add it to the first `matches` list in `manifest.json` **and** to `allowedWellyfishSender` in `background.js`.

Note: recent branded Chrome builds ignore `--load-extension` on the command line. Loading unpacked through the Extensions page works.

## How it works
1. In Wellyfish, after you **approve** your answers, the application screen shows **Fill it for me** (only if the extension is installed).
2. Wellyfish sends the approved answers to the extension (`window.postMessage` to a content script, same origin only). They are kept in `chrome.storage.session` (memory, not disk) for 15 minutes and used once.
3. The official page opens. A small Wellyfish box appears: **Fill the form** / **Not now**.
4. On click, the extension plans the fill with `core.js`, types the values, highlights each field, and shows a report (filled / left for you / couldn't fill).

## Safety rules (enforced in `core.js`, covered by `core.test.mjs`)
- **Allowlisted sites only.** The packet, the page origin and the path must all match `ALLOWED_SITES`. Anything else stops.
- **Stops, touching nothing,** if: the page needs a login, a CAPTCHA challenge is showing, the form can't be found, or the form's fields differ from the ones we prepared for (a new or missing field, including a new consent box).
- **Never fills** tax, banking, signature, consent or declaration fields (by name or label), and never touches checkboxes, radio buttons, file or password inputs.
- **Never clicks anything**: no Submit, no buttons.
- Selects accept only a listed option; numbers must be numbers; blank answers are skipped.
- Reports what was filled, skipped or failed. If it stops, the Wellyfish copy buttons and official link still work.

## Adding another form
1. Add `hubspotField` (or a new adapter) per question in `data/forms/<provider>.json`, plus `assistant.site` and `structureSnapshot.fieldNames`.
2. Add the site to `ALLOWED_SITES` in `core.js`, a content-script entry in `manifest.json`, and an adapter in `fill.js` if it isn't a HubSpot form.
3. Add tests to `core.test.mjs`.

## Tests
```bash
node --test agent/autofill/core.test.mjs
```
Browser end-to-end checks were run with Chrome for Testing loading this folder against the real FitOn page.

## Limits
- Beta. One form. Chrome only.
- The form can change; the extension then stops instead of guessing.
- HubSpot validates fields itself (for example it rejects fake `.example` emails); those messages stay visible for you to fix.

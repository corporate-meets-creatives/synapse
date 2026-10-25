import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ExtractError } from "../server/extraction/errors.js";
import { runExtraction } from "../server/extraction/index.js";

// Body: { url } (website or public social page) OR { text } (business text the owner pasted).
// Returns JSON only. Never writes to the database.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  // `fallback` tells the UI what to offer immediately: "paste_text" and/or "manual_entry".
  const fail = (status: number, code: string, message: string, fallback: string[] = []) =>
    res.status(status).json({ error: { code, message, fieldErrors: {}, ...(fallback.length ? { fallback } : {}) } });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(405, "method_not_allowed", "Use POST.");
  }
  const { url, text } = (req.body ?? {}) as { url?: unknown; text?: unknown };
  if (typeof url === "string" && url.length > 2048) return fail(400, "bad_request", "That address is too long.");
  if (typeof url !== "string" && typeof text !== "string") return fail(400, "bad_request", "Enter a website or social page address, or paste your business text.");

  try {
    return res.status(200).json(await runExtraction({ url, text }));
  } catch (e) {
    if (e instanceof ExtractError) return fail(e.status, e.code, e.message, e.fallback);
    return fail(500, "extraction_failed", "Something went wrong importing that source. Paste the business text instead, or enter details manually.", ["paste_text", "manual_entry"]);
  }
}

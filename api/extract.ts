import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ExtractError } from "../server/extraction/errors.js";
import { runExtraction } from "../server/extraction/index.js";

// Returns JSON only. Never writes to the database.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  const fail = (status: number, code: string, message: string) => res.status(status).json({ error: { code, message, fieldErrors: {} } });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(405, "method_not_allowed", "Use POST.");
  }
  const url = (req.body as { url?: unknown } | undefined)?.url;
  if (typeof url !== "string" || url.length > 2048) return fail(400, "bad_request", "Enter a valid website address, like https://yourstudio.com.");

  try {
    return res.status(200).json(await runExtraction(url));
  } catch (e) {
    if (e instanceof ExtractError) return fail(e.status, e.code, e.message);
    return fail(500, "extraction_failed", "Something went wrong importing that website. Enter your details manually.");
  }
}

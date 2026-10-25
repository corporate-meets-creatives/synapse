import type { VercelRequest, VercelResponse } from "@vercel/node";
import { MatchInputError, runMatch } from "../server/matching/index.js";

// Pure computation + Claude explanations. Returns JSON only; never writes to the database.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  const fail = (status: number, code: string, message: string) => res.status(status).json({ error: { code, message, fieldErrors: {} } });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(405, "method_not_allowed", "Use POST.");
  }
  try {
    return res.status(200).json(await runMatch(req.body));
  } catch (e) {
    if (e instanceof MatchInputError) return fail(400, "invalid_request", e.message);
    return fail(500, "match_failed", "We couldn't compute provider matches. Please try again.");
  }
}

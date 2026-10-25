import type { VercelRequest, VercelResponse } from "@vercel/node";
import { DraftInputError, getForm, listForms, runDraft } from "../server/drafting/index.js";

// POST: prepare answers (one instructor for instructor-level forms). GET: list forms; GET ?providerId=: one form definition.
// Returns JSON only. Never saves or submits an application.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  const fail = (status: number, code: string, message: string) => res.status(status).json({ error: { code, message, fieldErrors: {} } });

  try {
    if (req.method === "GET") {
      const id = req.query.providerId;
      if (typeof id !== "string") return res.status(200).json({ forms: listForms() });
      return res.status(200).json(getForm(id));
    }
    if (req.method === "POST") return res.status(200).json(await runDraft(req.body));
    res.setHeader("Allow", "GET, POST");
    return fail(405, "method_not_allowed", "Use GET or POST.");
  } catch (e) {
    if (e instanceof DraftInputError) return fail(400, "invalid_request", e.message);
    return fail(500, "draft_failed", "We couldn't prepare the answers. Please try again.");
  }
}

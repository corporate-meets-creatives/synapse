import type { VercelRequest, VercelResponse } from "@vercel/node";
import { QuestionsInputError, runQuestions } from "../server/matching/questions.js";

// POST: the short list of follow-up questions still needed for one provider (and one instructor for FLEX),
// with answers/corrections applied and readiness re-evaluated. Pure computation: no database, no Claude, no writes.
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  const fail = (status: number, code: string, message: string) => res.status(status).json({ error: { code, message, fieldErrors: {} } });
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return fail(405, "method_not_allowed", "Use POST.");
  }
  try {
    return res.status(200).json(runQuestions(req.body));
  } catch (e) {
    if (e instanceof QuestionsInputError) return fail(400, "invalid_request", e.message);
    return fail(500, "questions_failed", "We couldn't prepare the questions. Please try again.");
  }
}

import { evaluateAll } from "./evaluate.js";
import { explain, type CallExplainer } from "./explain.js";
import { MatchRequest, type MatchResponse } from "./types.js";

export class MatchInputError extends Error {}

export async function runMatch(body: unknown, call?: CallExplainer): Promise<MatchResponse> {
  const parsed = MatchRequest.safeParse(body);
  if (!parsed.success) throw new MatchInputError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  return { matches: await explain(evaluateAll(parsed.data), call) };
}

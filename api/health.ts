import type { VercelRequest, VercelResponse } from "@vercel/node";

// Readiness only: booleans, never values.
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: { code: "method_not_allowed", message: "Use GET.", fieldErrors: {} },
    });
  }
  const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  const databaseConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  return res.status(200).json({
    status: anthropicConfigured && databaseConfigured ? "ok" : "degraded",
    time: new Date().toISOString(),
    checks: { anthropicConfigured, databaseConfigured },
  });
}

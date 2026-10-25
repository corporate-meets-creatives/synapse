export type ExtractErrorCode =
  | "bad_request"
  | "blocked_url"
  | "source_blocked" // social/other source needs a login or blocks automated access
  | "extraction_failed"
  | "upstream_unavailable"
  | "payload_too_large"
  | "method_not_allowed";

export type Fallback = "paste_text" | "manual_entry";

/**
 * Carries a stable code + HTTP status. `fallback` tells the frontend what to offer right away
 * (paste business text, or enter details manually) instead of leaving the owner at a dead end.
 */
export class ExtractError extends Error {
  constructor(
    public code: ExtractErrorCode,
    message: string,
    public status: number,
    public fallback: Fallback[] = ["bad_request", "method_not_allowed", "payload_too_large"].includes(code) ? [] : ["paste_text", "manual_entry"],
  ) {
    super(message);
  }
}

export const FALLBACK_BOTH: Fallback[] = ["paste_text", "manual_entry"];

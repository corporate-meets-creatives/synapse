export type ExtractErrorCode =
  | "bad_request"
  | "blocked_url"
  | "extraction_failed"
  | "upstream_unavailable"
  | "method_not_allowed";

/** Carries a stable code + HTTP status so the handler can return a manual-entry-friendly error. */
export class ExtractError extends Error {
  constructor(
    public code: ExtractErrorCode,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

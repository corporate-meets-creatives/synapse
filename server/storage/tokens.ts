import { randomBytes, createHash } from "node:crypto";

export const newToken = () => randomBytes(32).toString("base64url"); // 43 chars
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export function readToken(header: string | string[] | undefined): string | null {
  const t = Array.isArray(header) ? header[0] : header;
  return t && /^[A-Za-z0-9_-]{43}$/.test(t) ? t : null;
}

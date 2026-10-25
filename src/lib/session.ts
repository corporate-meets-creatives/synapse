import { useEffect, useState } from "react";
import type { Studio } from "../../shared/schemas";
import { api, type MatchEntry, ApiError } from "./api";
import { savedToken } from "./local";

// Load the studio behind a private link. Remembers the link in this browser for "My applications".
export function useStudio(token: string) {
  const [studio, setStudio] = useState<Studio | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  useEffect(() => {
    let live = true;
    api.getStudio(token)
      .then((r) => { if (live) { setStudio(r.studio); savedToken.set(token); } })
      .catch((e) => { if (live) setError(e instanceof ApiError ? e : new ApiError(0, { code: "error", message: "Something went wrong.", fieldErrors: {} })); });
    return () => { live = false; };
  }, [token]);
  return { studio, error, setStudio };
}

// Match results are kept in memory so moving between results and details doesn't recompute.
const cache = new Map<string, MatchEntry[]>();
export const matchCache = {
  get: (token: string) => cache.get(token),
  set: (token: string, m: MatchEntry[]) => cache.set(token, m),
  clear: (token: string) => cache.delete(token),
};

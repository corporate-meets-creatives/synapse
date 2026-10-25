import { useEffect, useState } from "react";
import type { Application } from "../../shared/schemas";
import { api, ApiError } from "./api";

export function useApplication(token: string, id: string) {
  const [app, setApp] = useState<Application | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  useEffect(() => {
    let live = true;
    api.getApplication(token, id)
      .then((r) => { if (live) setApp(r.application); })
      .catch((e) => { if (live) setError(e); });
    return () => { live = false; };
  }, [token, id]);
  return { app, setApp, error };
}

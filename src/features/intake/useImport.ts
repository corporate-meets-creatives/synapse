import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../../lib/api";
import { draftImport } from "../../lib/local";
import { navigate } from "../../lib/router";

export const URL_STAGES = ["Reading your page", "Finding business details", "Preparing your summary"];
export const TEXT_STAGES = ["Reading your text", "Finding business details", "Preparing your summary"];

// What the owner has typed survives a failed import and a page refresh (this tab only).
const KEY = "wellyfish.intake";
type Saved = { url: string; text: string };
const load = (): Saved => {
  try { return { url: "", text: "", ...(JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as Partial<Saved>) }; } catch { return { url: "", text: "" }; }
};
const save = (s: Saved) => { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } };

export type ImportFailure = { message: string; offerPaste: boolean };

/** Runs the import (from a link or pasted text), shows progress, and keeps the owner's input if it fails. */
export function useImport() {
  const [url, setUrlState] = useState(() => load().url);
  const [text, setTextState] = useState(() => load().text);
  const [stage, setStage] = useState(-1); // -1 idle, 0..2 working
  const [mode, setMode] = useState<"url" | "text">("url");
  const [failure, setFailure] = useState<ImportFailure | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const setUrl = (v: string) => { setUrlState(v); save({ url: v, text }); };
  const setText = (v: string) => { setTextState(v); save({ url, text: v }); };

  const run = useCallback(async (kind: "url" | "text") => {
    const value = (kind === "url" ? url : text).trim();
    if (!value) return;
    setFailure(null);
    setMode(kind);
    setStage(0);
    timers.current = [setTimeout(() => setStage(1), 2500), setTimeout(() => setStage(2), 6000)];
    try {
      const result = await api.extract(kind === "url" ? { url: value } : { text: value });
      timers.current.forEach(clearTimeout);
      draftImport.set({ ...result, source: kind === "url" ? "website" : "pasted", sourceUrl: kind === "url" ? value : undefined });
      try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
      navigate("/profile/new");
    } catch (err) {
      timers.current.forEach(clearTimeout);
      setStage(-1);
      const e = err instanceof ApiError ? err : null;
      setFailure({
        message: e?.message ?? "We couldn't read that source.",
        // Anything that isn't a bad-input problem can be worked around by pasting the text.
        offerPaste: !e || e.fallback.includes("paste_text") || e.code === "network",
      });
    }
  }, [url, text]);

  /** Go to the review without importing; keeps a typed website so nothing is lost. */
  const manual = () => {
    draftImport.set({ source: "manual", ...(url.trim() ? { profile: { website: url.trim() } } : {}) });
    navigate("/profile/new");
  };

  return { url, setUrl, text, setText, stage, mode, failure, busy: stage >= 0, run, manual };
}

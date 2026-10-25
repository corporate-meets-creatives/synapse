// Per-browser conveniences only. Everything important lives on the server behind the private link.
const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } };
const del = (k: string) => { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } };

export const savedToken = {
  get: () => get("wellyfish.token"),
  set: (t: string) => set("wellyfish.token", t),
  clear: () => del("wellyfish.token"),
};

export type Need = {
  category: string; description: string; outcome: string; timeline: string;
  mode: "in_person" | "remote" | "either"; distanceMiles: string; budget: string;
};
export const emptyNeed: Need = { category: "", description: "", outcome: "", timeline: "", mode: "either", distanceMiles: "10", budget: "" };
export const savedNeed = {
  get: (token: string): Need | null => { const v = get(`wellyfish.need.${token.slice(0, 8)}`); try { return v ? { ...emptyNeed, ...JSON.parse(v) } : null; } catch { return null; } },
  set: (token: string, n: Need) => set(`wellyfish.need.${token.slice(0, 8)}`, JSON.stringify(n)),
};

// Import result handed from the import screen to the review screen (same tab only).
export const draftImport = {
  get: () => { try { const v = sessionStorage.getItem("wellyfish.import"); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (v: unknown) => { try { sessionStorage.setItem("wellyfish.import", JSON.stringify(v)); } catch { /* ignore */ } },
  clear: () => { try { sessionStorage.removeItem("wellyfish.import"); } catch { /* ignore */ } },
};

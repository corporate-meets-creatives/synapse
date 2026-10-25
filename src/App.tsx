import type { ReactNode } from "react";
import { Shell } from "./components/ui";
import { match, usePath } from "./lib/router";
import Welcome from "./pages/Welcome";
import Start from "./pages/Start";
import NewProfile from "./pages/NewProfile";
import EditProfile from "./pages/EditProfile";
import Need from "./pages/Need";
import Results from "./pages/Results";
import ProviderDetail from "./pages/ProviderDetail";
import Prepare from "./pages/Prepare";
import Questions from "./features/questions/Questions";
import Review from "./pages/Review";
import Done from "./pages/Done";
import Applications from "./pages/Applications";
import NotFound, { OpenLink } from "./pages/NotFound";

const routes: [string, (p: Record<string, string>) => ReactNode][] = [
  ["/", () => <Welcome />],
  ["/start", () => <Start />],
  ["/profile/new", () => <NewProfile />],
  ["/applications", () => <OpenLink />],
  ["/s/:token/need", (p) => <Need token={p.token} />],
  ["/s/:token/results", (p) => <Results token={p.token} />],
  ["/s/:token/providers/:providerId", (p) => <ProviderDetail token={p.token} providerId={p.providerId} />],
  ["/s/:token/providers/:providerId/questions", (p) => <Questions token={p.token} providerId={p.providerId} />],
  ["/s/:token/apply/:id", (p) => <Prepare token={p.token} id={p.id} />],
  ["/s/:token/apply/:id/review", (p) => <Review token={p.token} id={p.id} />],
  ["/s/:token/apply/:id/done", (p) => <Done token={p.token} id={p.id} />],
  ["/s/:token/applications", (p) => <Applications token={p.token} />],
  ["/s/:token/profile", (p) => <EditProfile token={p.token} />],
];

export default function App() {
  const path = usePath();
  for (const [pattern, render] of routes) {
    const params = match(pattern, path);
    if (params) return <Shell key={path}>{render(params)}</Shell>;
  }
  return <Shell><NotFound /></Shell>;
}

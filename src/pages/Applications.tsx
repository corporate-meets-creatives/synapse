import { useEffect, useState } from "react";
import type { Application } from "../../shared/schemas";
import { Badge, Button, Loading, PageTitle, Panel } from "../components/ui";
import { navigate } from "../lib/router";
import { api } from "../lib/api";
import { statusLabel } from "../lib/labels";
import { formatDate, providerById } from "../lib/catalog";
import { savedNeed } from "../lib/local";
import { useStudio } from "../lib/session";
import { NotFoundLink } from "./NotFound";
import PrivateLink from "../components/PrivateLink";

export default function Applications({ token }: { token: string }) {
  const { studio, error } = useStudio(token);
  const [apps, setApps] = useState<Application[] | null>(null);
  useEffect(() => { api.listApplications(token).then((r) => setApps(r.applications)).catch(() => setApps([])); }, [token]);
  const need = savedNeed.get(token);

  if (error) return <NotFoundLink />;
  if (!apps) return <Loading label="Loading your applications" />;

  const names = Object.fromEntries((studio?.instructors ?? []).map((i) => [i.id, i.name]));
  const open = (a: Application) =>
    navigate(`/s/${token}/apply/${a.id}${a.status === "draft" ? "" : "/done"}`);

  return (
    <>
      <PageTitle sub="Status updates come from you. Providers reply to you directly, not to Wellyfish.">My applications</PageTitle>
      {apps.length === 0 ? (
        <Panel className="max-w-xl">
          <h2 className="text-xl">No applications yet</h2>
          <p className="mt-1 text-muted">Find a provider that fits your studio and we'll prepare the application with you.</p>
          <Button className="mt-4" onClick={() => navigate(`/s/${token}/results`)}>Find providers</Button>
        </Panel>
      ) : (
        <ul className="space-y-4">
          {apps.map((a) => {
            const s = statusLabel(a);
            const p = providerById(a.providerId);
            return (
              <li key={a.id}>
                <Panel className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl">{p?.name ?? a.providerId}</h2>
                    <p className="text-sm text-muted">
                      {a.instructorId && names[a.instructorId] ? `For ${names[a.instructorId]} · ` : "For the studio · "}
                      {need?.category ?? "Wellness program partnership"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone={s.tone}>{s.text}</Badge>
                      {a.status === "submitted_owner_reported" && <span className="text-xs text-muted">Owner-reported</span>}
                    </div>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p><span className="text-muted">Last update</span> {formatDate(a.updatedAt)}</p>
                    <p className="mt-1"><span className="text-muted">Next</span> {s.next}</p>
                    <Button variant="secondary" className="mt-3" onClick={() => open(a)}>Open</Button>
                  </div>
                </Panel>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-8 max-w-2xl"><PrivateLink token={token} compact /></div>
    </>
  );
}

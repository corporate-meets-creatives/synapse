import { useState, type FormEvent } from "react";
import { Button, PageTitle, Panel, Select, Steps, TextArea, TextField } from "../components/ui";
import { INTAKE_STEPS, CATEGORIES } from "../lib/steps";
import { emptyNeed, savedNeed, type Need as NeedT } from "../lib/local";
import { navigate } from "../lib/router";
import { matchCache } from "../lib/session";
import PrivateLink from "../components/PrivateLink";

export default function Need({ token }: { token: string }) {
  const [n, setN] = useState<NeedT>(() => savedNeed.get(token) ?? { ...emptyNeed, category: CATEGORIES[0] });
  const set = <K extends keyof NeedT>(k: K, v: NeedT[K]) => setN((c) => ({ ...c, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    savedNeed.set(token, n);
    matchCache.clear(token);
    navigate(`/s/${token}/results`);
  }

  return (
    <>
      <Steps steps={INTAKE_STEPS} current={2} />
      <PageTitle sub="This helps us explain why each provider fits. You can change it any time.">
        What does your business need help with?
      </PageTitle>
      <div className="mb-6 max-w-2xl"><PrivateLink token={token} /></div>
      <form onSubmit={submit} className="max-w-2xl">
        <Panel className="space-y-5">
          <TextArea id="n-desc" label="Describe it in your own words" value={n.description}
            placeholder="I run a dance studio in Bellevue and want more older adults in our daytime ballroom classes."
            onChange={(e) => set("description", e.target.value)} />
          <Select id="n-cat" label="Type of help" value={n.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <TextField id="n-out" label="What would a good outcome look like?" value={n.outcome}
            placeholder="Ten new regular students by spring" onChange={(e) => set("outcome", e.target.value)} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Select id="n-time" label="Preferred timeline" value={n.timeline} onChange={(e) => set("timeline", e.target.value)}>
              <option value="">No rush</option><option>This month</option><option>Next 3 months</option><option>This year</option>
            </Select>
            <Select id="n-mode" label="Support format" value={n.mode} onChange={(e) => set("mode", e.target.value as NeedT["mode"])}>
              <option value="either">In person or remote</option><option value="in_person">In person</option><option value="remote">Remote</option>
            </Select>
          </div>
          {n.mode !== "remote" && (
            <TextField id="n-dist" label="How far would you travel? (miles)" type="number" min={0} value={n.distanceMiles}
              onChange={(e) => set("distanceMiles", e.target.value)} />
          )}
          {n.category === "Funding or grants" && (
            <TextField id="n-budget" label="Funding amount you're looking for" value={n.budget} placeholder="$5,000"
              onChange={(e) => set("budget", e.target.value)} />
          )}
          <Button type="submit">Find matching providers</Button>
        </Panel>
      </form>
    </>
  );
}

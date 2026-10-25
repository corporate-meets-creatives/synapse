import type { ApplicationField } from "../../shared/schemas";
import { Badge } from "./ui";

export default function ProvenanceBadge({ field: f }: { field: ApplicationField }) {
  if (f.needsInput) return <Badge tone="coral">Needs your input</Badge>;
  if (f.provenance === "ai_draft") return <Badge tone="jelly">AI-drafted — review</Badge>;
  if (f.provenance === "owner_edited") return <Badge tone="ocean">Edited by you</Badge>;
  return <Badge tone="lagoon">From your confirmed profile</Badge>;
}

import { useMemo, useState } from "react";
import ProfileForm, { type ProfileDraft } from "../components/ProfileForm";
import { Notice, PageTitle, Steps } from "../components/ui";
import Summary from "../features/profile/Summary";
import type { Draft } from "../features/profile/buildProfile";
import { INTAKE_STEPS } from "../lib/steps";
import { draftImport, savedToken } from "../lib/local";
import { navigate } from "../lib/router";
import { api } from "../lib/api";
import type { InstructorInput, StudioProfileInput } from "../../shared/schemas";

type Imported = { source?: "website" | "pasted" | "manual"; profile?: Draft; missingFields?: string[]; pagesRead?: string[] };

export default function NewProfile() {
  const imported = useMemo(() => {
    const d = draftImport.get() as Imported | null;
    // Offerings the page lists ("services") fill the class types when none were found, with the same source.
    const svc = d?.profile?.services;
    if (d?.profile && svc?.length && !d.profile.classTypes?.length) {
      d.profile = { ...d.profile, classTypes: svc, fieldMeta: { ...d.profile.fieldMeta, ...(d.profile.fieldMeta?.services ? { classTypes: d.profile.fieldMeta.services } : {}) } };
    }
    return d;
  }, []);
  const imports = imported?.source === "website" || imported?.source === "pasted";
  // Imports start on the short summary; "Edit all details" (or manual entry) opens the full form with everything carried over.
  const [full, setFull] = useState<Draft | null>(imports ? null : (imported?.profile ?? {}));

  const save = async (profile: StudioProfileInput, instructors: InstructorInput[]) => {
    const { token } = await api.createStudio(profile, instructors);
    savedToken.set(token);
    draftImport.clear();
    navigate(`/s/${token}/need`, true);
  };

  return (
    <>
      <Steps steps={INTAKE_STEPS} current={1} />
      <PageTitle sub={imports && !full ? "Check what we found, fix anything that's off, and confirm." : "Tell us about your studio. You can change any of this later."}>
        {imports && !full ? "Your business at a glance" : "Review your business profile"}
      </PageTitle>
      {imports && full && (
        <div className="mb-6 max-w-2xl">
          <Notice tone="jelly" title="Everything we found is filled in">Fields marked “From website” link to the page they came from. Nothing is saved until you confirm.</Notice>
        </div>
      )}
      {!full ? (
        <Summary initial={imported?.profile ?? {}} pagesRead={imported?.pagesRead ?? []} source={imported?.source === "pasted" ? "pasted" : "website"}
          onConfirm={save} onEditAll={(current) => setFull(current)} />
      ) : (
        <ProfileForm
          initial={{ state: "WA", ...(full as ProfileDraft) }}
          initialInstructors={[{ name: "", certifications: [], requirementAnswers: {} }]}
          missingFields={imported?.missingFields}
          submitLabel="Confirm and continue"
          onSubmit={save}
        />
      )}
    </>
  );
}

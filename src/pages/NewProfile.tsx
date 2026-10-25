import { useMemo } from "react";
import ProfileForm, { type ProfileDraft } from "../components/ProfileForm";
import { Notice, PageTitle, Steps } from "../components/ui";
import { INTAKE_STEPS } from "../lib/steps";
import { draftImport, savedToken } from "../lib/local";
import { navigate } from "../lib/router";
import { api } from "../lib/api";

export default function NewProfile() {
  const imported = useMemo(() => draftImport.get() as { source?: string; profile?: ProfileDraft; missingFields?: string[]; pagesRead?: string[] } | null, []);
  const fromWebsite = imported?.source === "website";
  return (
    <>
      <Steps steps={INTAKE_STEPS} current={1} />
      <PageTitle sub={fromWebsite ? "We filled in what we found. Check every field, fix anything that's off, and add what's missing." : "Tell us about your studio. You can change any of this later."}>
        Review your business profile
      </PageTitle>
      {fromWebsite && (
        <div className="mb-6 max-w-2xl">
          <Notice tone="jelly" title={`Read ${imported?.pagesRead?.length ?? 1} page${(imported?.pagesRead?.length ?? 1) === 1 ? "" : "s"} from your website`}>
            Fields marked “From website” link to the page they came from. Nothing is saved until you confirm.
          </Notice>
        </div>
      )}
      <ProfileForm
        initial={{ state: "WA", ...(imported?.profile ?? {}) }}
        initialInstructors={[{ name: "", certifications: [], requirementAnswers: {} }]}
        missingFields={imported?.missingFields}
        submitLabel="Confirm and continue"
        onSubmit={async (profile, instructors) => {
          const { token } = await api.createStudio(profile, instructors);
          savedToken.set(token);
          draftImport.clear();
          navigate(`/s/${token}/need`, true);
        }}
      />
    </>
  );
}

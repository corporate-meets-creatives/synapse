import { useState } from "react";
import ProfileForm from "../components/ProfileForm";
import { Loading, Notice, PageTitle } from "../components/ui";
import { useStudio, matchCache } from "../lib/session";
import { api } from "../lib/api";
import { NotFoundLink } from "./NotFound";
import PrivateLink from "../components/PrivateLink";

export default function EditProfile({ token }: { token: string }) {
  const { studio, error } = useStudio(token);
  const [saved, setSaved] = useState(false);
  if (error) return <NotFoundLink />;
  if (!studio) return <Loading label="Loading your profile" />;
  return (
    <>
      <PageTitle sub="Changes here are used for new matches and new applications.">Business profile</PageTitle>
      {saved && <div className="mb-6 max-w-2xl"><Notice tone="lagoon" title="Profile saved" /></div>}
      <div className="mb-6 max-w-2xl"><PrivateLink token={token} compact /></div>
      <ProfileForm
        key={studio.updated_at}
        initial={studio.profile}
        initialInstructors={studio.instructors}
        submitLabel="Save profile"
        onSubmit={async (profile, instructors) => {
          await api.updateStudio(token, profile, instructors);
          matchCache.clear(token);
          setSaved(true);
          window.scrollTo(0, 0);
        }}
      />
    </>
  );
}

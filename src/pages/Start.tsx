import { PageTitle, Steps } from "../components/ui";
import ImportPanel from "../features/intake/ImportPanel";
import { INTAKE_STEPS } from "../lib/steps";

export default function Start() {
  return (
    <>
      <Steps steps={INTAKE_STEPS} current={0} />
      <PageTitle sub="Paste your website or social page, or type your details. Both lead to the same review.">
        Set up your business profile
      </PageTitle>
      <ImportPanel />
    </>
  );
}

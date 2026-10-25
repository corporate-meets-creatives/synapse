import { createStudio } from "../server/storage/profiles.js";
import {
  createApplication, editApplication, approveApplication, markSubmitted, getApplication, AppError,
} from "../server/storage/applications.js";

const ok = (label: string, pass: boolean) => console.log(`${pass ? "OK    " : "FAILED"}  ${label}`);
const expectError = async (label: string, code: string, fn: () => Promise<unknown>) => {
  try { await fn(); ok(label, false); } catch (e) { ok(label, e instanceof AppError && e.code === code); }
};

const { studio } = await createStudio(
  { name: "App Test Studio", city: "Bellevue", state: "WA", danceStyles: [], classTypes: [], fieldMeta: {} },
  [{ name: "Maria", certifications: [] }],
);
const other = await createStudio(
  { name: "Other Studio", city: "Seattle", state: "WA", danceStyles: [], classTypes: [], fieldMeta: {} },
  [{ name: "Sam", certifications: [] }],
);

let app = await createApplication(studio.id, {
  providerId: "forma", instructorId: studio.instructors[0].id, formVersion: "2026-10-25",
  fields: [{ questionId: "name", answer: "Diana", provenance: "owner_confirmed", needsInput: false },
           { questionId: "phone", answer: "", provenance: "ai_draft", needsInput: true }],
});
ok("created as draft, version 1", app.status === "draft" && app.version === 1);

await expectError("instructor from another studio rejected", "invalid_instructor", () =>
  createApplication(studio.id, { providerId: "forma", instructorId: other.studio.instructors[0].id, formVersion: "x", fields: [] }));
await expectError("other studio can't read it", "not_found", () => getApplication(other.studio.id, app.id));
await expectError("can't approve with missing input", "needs_input", () => approveApplication(studio.id, app.id, 1));
await expectError("can't mark submitted before approval", "not_approved", () => markSubmitted(studio.id, app.id));

app = await editApplication(studio.id, app.id, 1, [
  { questionId: "name", answer: "Diana", provenance: "owner_confirmed", needsInput: false },
  { questionId: "phone", answer: "425-555-0100", provenance: "owner_edited", needsInput: false },
]);
ok("edit saved, version 2", app.version === 2 && app.fields[1].answer === "425-555-0100");

await expectError("stale edit rejected", "version_conflict", () => editApplication(studio.id, app.id, 1, []));

app = await approveApplication(studio.id, app.id, 2);
ok("approved version 2", app.status === "approved_for_copying" && app.approvedVersion === 2);

app = await editApplication(studio.id, app.id, 2, app.fields.map((f) => ({ ...f, answer: f.answer + " " })));
ok("edit after approval clears approval", app.status === "draft" && app.approvedVersion === null && app.version === 3);

app = await approveApplication(studio.id, app.id, 3);
app = await markSubmitted(studio.id, app.id, "2026-10-25");
ok("owner-reported submission recorded", app.status === "submitted_owner_reported" && app.submittedAt !== null);

await expectError("can't edit after submission", "already_submitted", () => editApplication(studio.id, app.id, app.version, []));

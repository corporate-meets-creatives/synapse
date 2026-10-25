import { createStudio, findStudioByToken, updateStudio } from "../server/storage/profiles.js";

const { token, studio } = await createStudio(
  { name: "Test Ballroom", city: "Bellevue", state: "WA", danceStyles: [], classTypes: [], fieldMeta: {} },
  [{ name: "Maria", certifications: [] }],
);
console.log("created studio", studio.id, "instructors:", studio.instructors.length, "token length:", token.length);

const loaded = await findStudioByToken(token);
console.log("load with real token:", loaded ? "OK" : "FAILED");

const bad = await findStudioByToken("x".repeat(43));
console.log("load with wrong token:", bad === null ? "OK (not found)" : "FAILED");

const maria = loaded!.instructors[0];
const updated = await updateStudio(studio.id, loaded!.profile, [
  { id: maria.id, name: "Maria R", certifications: [] },
  { name: "Sam", certifications: [] },
]);
console.log("Maria kept same ID:", updated.find((i) => i.name === "Maria R")?.id === maria.id ? "OK" : "FAILED");
console.log("instructors now:", updated.length);

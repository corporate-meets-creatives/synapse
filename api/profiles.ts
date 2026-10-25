import type { z } from "zod";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SaveStudioRequest } from "../shared/schemas.js";
import { readToken } from "../server/storage/tokens.js";
import { createStudio, findStudioByToken, updateStudio } from "../server/storage/profiles.js";

type FieldErrors = Record<string, string[]>;

// Same error shape as Vansh's api/health.ts
const fail = (res: VercelResponse, status: number, code: string, message: string, fieldErrors: FieldErrors = {}) =>
  res.status(status).json({ error: { code, message, fieldErrors } });

// Zod issues -> { "profile.name": ["Too small..."] }
const fieldErrorsOf = (e: z.ZodError): FieldErrors => {
  const out: FieldErrors = {};
  for (const issue of e.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "POST") {
      const body = SaveStudioRequest.safeParse(req.body);
      if (!body.success) return fail(res, 400, "invalid_profile", "Some profile fields are invalid.", fieldErrorsOf(body.error));
      const result = await createStudio(body.data.profile, body.data.instructors);
      return res.status(201).json(result); // token returned once
    }

    const token = readToken(req.headers["x-access-token"]);
    const studio = token ? await findStudioByToken(token) : null;
    if (!studio) return fail(res, 404, "not_found", "Link not found."); // same for bad and unknown tokens

    if (req.method === "GET") return res.status(200).json({ studio });

    if (req.method === "PUT") {
      const body = SaveStudioRequest.safeParse(req.body);
      if (!body.success) return fail(res, 400, "invalid_profile", "Some profile fields are invalid.", fieldErrorsOf(body.error));
      const instructors = await updateStudio(studio.id, body.data.profile, body.data.instructors);
      return res.status(200).json({ studio: { ...studio, profile: body.data.profile, instructors } });
    }

    res.setHeader("Allow", "GET, POST, PUT");
    return fail(res, 405, "method_not_allowed", "Use GET, POST or PUT.");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    if (msg === "instructor_not_owned") return fail(res, 400, "invalid_instructor", "That instructor doesn't belong to this studio.");
    console.error("profiles_error", msg); // never log headers or tokens
    return fail(res, 500, "server_error", "Something went wrong. Please try again.");
  }
}

import type { z } from "zod";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { CreateApplicationRequest, UpdateApplicationRequest } from "../shared/schemas.js";
import { readToken } from "../server/storage/tokens.js";
import { findStudioByToken } from "../server/storage/profiles.js";
import {
  AppError, listApplications, getApplication, createApplication,
  editApplication, approveApplication, markSubmitted,
} from "../server/storage/applications.js";

type FieldErrors = Record<string, string[]>;
const fail = (res: VercelResponse, status: number, code: string, message: string, fieldErrors: FieldErrors = {}) =>
  res.status(status).json({ error: { code, message, fieldErrors } });

const fieldErrorsOf = (e: z.ZodError): FieldErrors => {
  const out: FieldErrors = {};
  for (const issue of e.issues) (out[issue.path.join(".") || "_"] ??= []).push(issue.message);
  return out;
};

const queryId = (req: VercelRequest) => {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");
  try {
    // Private link check on every request
    const token = readToken(req.headers["x-access-token"]);
    const studio = token ? await findStudioByToken(token) : null;
    if (!studio) return fail(res, 404, "not_found", "Link not found.");

    const id = queryId(req);

    if (req.method === "GET") {
      if (id) return res.status(200).json({ application: await getApplication(studio.id, id) });
      return res.status(200).json({ applications: await listApplications(studio.id) });
    }

    if (req.method === "POST") {
      const body = CreateApplicationRequest.safeParse(req.body);
      if (!body.success) return fail(res, 400, "invalid_application", "Some fields are invalid.", fieldErrorsOf(body.error));
      return res.status(201).json({ application: await createApplication(studio.id, body.data) });
    }

    if (req.method === "PATCH") {
      if (!id) return fail(res, 400, "missing_id", "Add ?id=<application id>.");
      const body = UpdateApplicationRequest.safeParse(req.body);
      if (!body.success) return fail(res, 400, "invalid_update", "That update isn't valid.", fieldErrorsOf(body.error));
      const u = body.data;
      const application =
        u.action === "edit" ? await editApplication(studio.id, id, u.expectedVersion, u.fields)
        : u.action === "approve" ? await approveApplication(studio.id, id, u.version)
        : await markSubmitted(studio.id, id, u.submittedAt);
      return res.status(200).json({ application });
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    return fail(res, 405, "method_not_allowed", "Use GET, POST or PATCH.");
  } catch (e) {
    if (e instanceof AppError) return fail(res, e.status, e.code, e.message, e.fieldErrors);
    console.error("applications_error", e instanceof Error ? e.message : "unknown"); // never log tokens
    return fail(res, 500, "server_error", "Something went wrong. Please try again.");
  }
}

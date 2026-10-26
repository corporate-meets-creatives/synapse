# Wellyfish API contract

All endpoints are Vercel functions under `/api`. Request and response types live in
`shared/schemas.ts` (studio, instructor, application, errors) and, for the richer matching and
drafting shapes, `server/matching/types.ts`, `server/matching/questions.ts` and `server/drafting/types.ts`.
Mock responses for building the UI without a backend are in `shared/mocks/`.

## Conventions
- **Private link:** studio data is reached with a 43-character token returned once by `POST /api/profiles`.
  Send it as the header `x-access-token`, never in the URL of an API call. A wrong or unknown token
  always returns `404 not_found`, so links can't be probed.
- **Errors** (every endpoint): `{ "error": { "code", "message", "fieldErrors", "fallback"? } }`.
  `message` is safe to show to the owner. `fieldErrors` maps a field path to messages.
  See `shared/mocks/errors/`.
- **Provenance** on every fact and answer: `owner_confirmed`, `ai_draft`, `owner_edited`, plus a
  `source` URL for anything read from a website (`fieldMeta`).
- Nothing is ever submitted to a vendor. "Submitted" is only ever reported by the owner.

## Endpoints

| Method & path | Auth | Request | Response |
|---|---|---|---|
| `GET /api/health` | — | — | `{ status: "ok" \| "degraded", checks: { anthropicConfigured, databaseConfigured } }` (booleans only) |
| `POST /api/extract` | — | `{ url }` (website or public social page) **or** `{ text }` (pasted business text) | `ExtractResponse`: `{ profile, missingFields, pagesRead }`. Errors may include `fallback`. Mocks: `extract-missing-info.json`, `errors/extract-blocked.json` |
| `POST /api/profiles` | — | `SaveStudioRequest`: `{ profile, instructors[] }` | `201 { token, studio }` (token shown once). Mock: `studio.json` |
| `GET /api/profiles` | token | — | `{ studio }` |
| `PUT /api/profiles` | token | `SaveStudioRequest` (instructors keep their `id` to stay stable) | `{ studio }`. Errors: `invalid_profile`, `invalid_instructor` |
| `POST /api/match` | — | `MatchRequest`: `{ studio, instructors[], studioConfirmed? }` | `{ matches: MatchEntry[] }` with `fitLabel`, `readiness`, `missingToApply`, `missingBeforeTeaching`, `blockers`, `requirementResults`, sources, `lastChecked`, `explanation`. Eligibility is never confirmed. Mock: `matches.json` |
| `POST /api/questions` | — | `QuestionsRequest`: `{ providerId, studio, instructors[], instructorId?, newInstructor?, answers[], existingAnswers[] }` | Follow-up questions still needed for one vendor, what's already on file, and updated readiness |
| `GET /api/draft` | — | `?providerId=` optional | Without it: list of forms. With it: one `FormDef` (questions, `isDemo`, `portalUrl`) |
| `POST /api/draft` | — | `DraftRequest`: `{ providerId, studio, instructor?, existingAnswers[], regenerateQuestionIds[] }` | `DraftResponse`: answers in form order, `missingQuestionIds`, `aiDraftedQuestionIds`, `ownerOnlyQuestionIds` (tax, bank, declarations: never filled) |
| `GET /api/applications` | token | `?id=` optional | `{ applications }` or `{ application }` |
| `POST /api/applications` | token | `CreateApplicationRequest`: `{ providerId, instructorId, formVersion, fields[] }` | `201 { application }` (status `draft`) |
| `PATCH /api/applications?id=` | token | `{ action: "edit", expectedVersion, fields }` · `{ action: "approve", version }` · `{ action: "mark_submitted", submittedAt? }` | `{ application }`. Editing clears approval. Errors: `version_conflict`, `needs_input`, `not_approved`, `already_submitted`. Mocks: `application.json`, `application-needs-input.json` |

## Application statuses
`draft` → `approved_for_copying` (owner approved this exact `version`) → `submitted_owner_reported`
(owner says they submitted on the vendor's site, with a date). Opening the vendor portal or copying
answers never changes the status.

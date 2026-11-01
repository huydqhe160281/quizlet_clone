# ai-generate-set-api Specification

## Purpose

TBD - created by archiving change ai-set-generation. Update Purpose after archive.

## Requirements

### Requirement: Authenticated generation endpoint

The system SHALL expose `POST /api/v1/ai/generate-set` requiring a valid session via `requireUserId()` before any rate-limit or AI logic runs.
**Constraint**: MUST
**Verification**: Integration test with mocked AI provider; 401 without session.

#### Scenario: Successful generation

- **GIVEN** an authenticated user and valid `{ prompt, cardCount: 15 }`
- **WHEN** the client POSTs to `/api/v1/ai/generate-set`
- **THEN** the response is 201 with `{ data: { set: { id, title, description, visibility }, cards: [{ id, front, back, example?, sortOrder }] } }` where set.visibility is `PRIVATE`

#### Scenario: Unauthenticated request

- **GIVEN** no session cookie
- **WHEN** POST `/api/v1/ai/generate-set`
- **THEN** response is 401 before rate-limit check

### Requirement: Input validation

The system SHALL validate body with Zod: `prompt` string trim min 10 max 10000; `cardCount` optional int min 5 max 200.
**Constraint**: MUST
**Verification**: Unit test on schema; 400 on invalid input.

#### Scenario: Invalid card count above max

- **GIVEN** authenticated user
- **WHEN** POST with `cardCount: 201`
- **THEN** response is 400 with validation error

#### Scenario: Invalid card count below min

- **GIVEN** authenticated user
- **WHEN** POST with `cardCount: 4`
- **THEN** response is 400 with validation error

#### Scenario: Invalid prompt too short

- **GIVEN** authenticated user
- **WHEN** POST with `prompt: "short"`
- **THEN** response is 400 with validation error

#### Scenario: Invalid prompt too long

- **GIVEN** authenticated user
- **WHEN** POST with `prompt` exceeding 10000 characters
- **THEN** response is 400 with validation error

#### Scenario: Unlimited mode

- **GIVEN** authenticated user
- **WHEN** POST with `prompt` only (no `cardCount`)
- **THEN** request is accepted and service generates without an explicit card limit

### Requirement: MotAPI provider configuration

AI generation SHALL call MotAPI (OpenAI-compatible, default base URL `https://motapis.com/v1`, overridable with `MOTAPI_BASE_URL`) through the Vercel AI SDK. `MOTAPI_KEY` SHALL be required and read lazily, so a missing key fails only the AI feature, not every request. The ordered model list SHALL come from `MOTAPI_SET_MODELS` (comma-separated) with defaults in `src/config/motapi-env.ts`, so it can change without a code edit. The key SHALL never be committed.
**Constraint**: MUST
**Verification**: Unit tests on `motapi-env` resolution and `env` getters.

#### Scenario: Missing MotAPI key

- **GIVEN** `MOTAPI_KEY` unset
- **WHEN** the AI service reads its configuration
- **THEN** env resolution throws `Missing required environment variable: MOTAPI_KEY`, and importing `env` elsewhere still works

### Requirement: Model switching without retries

Each generation SHALL call one model at a time from the ordered list. Any failure — HTTP 401/429/5xx, timeout, empty output, or output that fails parsing or Zod validation — SHALL switch to the next model. A model SHALL never be retried, SDK retries SHALL be off (`maxRetries: 0`), and at most 3 calls SHALL be made in total, within a time budget under the route's `maxDuration`.
**Constraint**: MUST
**Verification**: `model-switch.test.ts`, `ai-set.service.test.ts`.

#### Scenario: Unparsable output switches model

- **GIVEN** the first model returns JSON that fails validation
- **WHEN** the service processes it
- **THEN** the second model is called once and its valid result is saved

#### Scenario: Three failures

- **GIVEN** every model fails
- **WHEN** a generation request runs
- **THEN** exactly 3 models are called and the response is 502 `AI_GENERATION_FAILED`

### Requirement: Structured AI output

The system SHALL use Vercel AI SDK JSON mode and validate with Zod schema defining `title`, `description`, and `cards[]` with `front`, `back`, optional `example`.
**Constraint**: MUST
**Verification**: Service unit test with mocked AI output parsing.

#### Scenario: LLM returns valid structure

- **GIVEN** the model returns matching JSON
- **WHEN** service processes result
- **THEN** Prisma creates one `FlashcardSet` and N `Flashcard` records with sequential `sortOrder`

#### Scenario: LLM returns invalid structure

- **GIVEN** every model tried returns JSON that fails Zod validation
- **WHEN** service processes result
- **THEN** response is 502 with code `AI_GENERATION_FAILED` and no partial set is persisted

### Requirement: Upstream AI failure handling

The system SHALL return 502 when every model tried is unreachable, times out, or returns a non-2xx response. No draft set SHALL be created on failure.
**Constraint**: MUST
**Verification**: Service unit test with mocked provider errors.

#### Scenario: MotAPI connection refused

- **GIVEN** the MotAPI endpoint is unreachable
- **WHEN** user submits a valid generation request
- **THEN** response is 502 with code `AI_GENERATION_FAILED`

### Requirement: AI rate limiting

The system SHALL enforce 10 requests per hour per user on the AI generate endpoint after authentication. In-memory limiter resets on serverless cold start (accepted v1 non-goal).
**Constraint**: MUST (best-effort per warm instance)
**Verification**: Unit test on rate limiter; 429 on 11th request within hour on same instance.

#### Scenario: Rate limit exceeded

- **GIVEN** user has made 10 AI requests in the past hour on the same warm instance
- **WHEN** they submit an 11th request
- **THEN** response is 429 with code `RATE_LIMITED`

### Requirement: Cache invalidation after create

After creating an AI draft set, the service SHALL call the same cache invalidation pattern as `createSet` (`revalidateTag` for `sets-${userId}`).
**Constraint**: MUST
**Verification**: Service unit test asserts invalidation helper invoked.

#### Scenario: New draft appears in sets list

- **GIVEN** successful AI generation for user U
- **WHEN** user fetches `/api/v1/sets`
- **THEN** the new draft set is included without stale-cache delay

### Requirement: Route timeout configuration

The AI route SHALL set `export const maxDuration = 300` to accommodate model latency (up to 3 model calls) for large or unlimited card generation. Generation is not moved to a background server job: the client keeps the request alive while the user works elsewhere (see `ai-generate-modal-ui`).
**Constraint**: MUST
**Verification**: Route segment export present.

#### Scenario: Route exports maxDuration

- **GIVEN** the generate-set route module
- **WHEN** inspected for segment config
- **THEN** `export const maxDuration` is defined with value ≥ 300

---

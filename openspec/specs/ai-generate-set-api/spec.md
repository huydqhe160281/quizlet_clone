# ai-generate-set-api Specification

## Purpose

TBD - created by archiving change ai-set-generation. Update Purpose after archive.

## Requirements

### Requirement: Authenticated generation endpoint

The system SHALL expose `POST /api/v1/ai/generate-set` requiring a valid session via `requireUserId()` before any rate-limit or AI logic runs.
**Constraint**: MUST
**Verification**: Integration test with mocked Ollama; 401 without session.

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

### Requirement: Ollama environment configuration

`OLLAMA_BASE_URL` and `OLLAMA_MODEL` SHALL be required in production via `env.ts` (using `required()` helper). `OLLAMA_MODEL_LARGE` MAY be provided for high-card requests. In development only, defaults MAY be `http://localhost:11434/api` and `llama3` when unset.
**Constraint**: MUST
**Verification**: Unit test on env resolution; startup error in production when missing.

#### Scenario: Production missing Ollama URL

- **GIVEN** `NODE_ENV=production` and `OLLAMA_BASE_URL` unset
- **WHEN** the AI route handler initializes
- **THEN** env resolution throws a clear configuration error

### Requirement: Structured Ollama output

The system SHALL use Vercel AI SDK JSON mode and validate with Zod schema defining `title`, `description`, and `cards[]` with `front`, `back`, optional `example`.
**Constraint**: MUST
**Verification**: Service unit test with mocked AI output parsing.

#### Scenario: LLM returns valid structure

- **GIVEN** Ollama returns matching JSON
- **WHEN** service processes result
- **THEN** Prisma creates one `FlashcardSet` and N `Flashcard` records with sequential `sortOrder`

#### Scenario: LLM returns invalid structure

- **GIVEN** Ollama returns JSON that fails Zod validation
- **WHEN** service processes result
- **THEN** response is 502 with code `AI_GENERATION_FAILED` and no partial set is persisted

### Requirement: Upstream AI failure handling

The system SHALL return 502 when Ollama is unreachable, times out, or returns a non-2xx response. No draft set SHALL be created on failure.
**Constraint**: MUST
**Verification**: Service unit test with mocked provider errors.

#### Scenario: Ollama connection refused

- **GIVEN** Ollama endpoint is unreachable
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

The AI route SHALL set `export const maxDuration = 120` to accommodate Ollama latency for large or unlimited card generation.
**Constraint**: MUST
**Verification**: Route segment export present.

#### Scenario: Route exports maxDuration

- **GIVEN** the generate-set route module
- **WHEN** inspected for segment config
- **THEN** `export const maxDuration` is defined with value ≥ 120

---

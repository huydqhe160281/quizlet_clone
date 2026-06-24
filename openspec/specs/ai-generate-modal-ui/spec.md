# ai-generate-modal-ui Specification

## Purpose

TBD - created by archiving change ai-set-generation. Update Purpose after archive.

## Requirements

### Requirement: Entry point button

The Sets list page SHALL display a "Generate with AI" button with gradient/glow styling adjacent to "Create set", including the empty-state card.
**Constraint**: MUST
**Verification**: Visual/manual; component render test.

#### Scenario: Open modal from sets list

- **GIVEN** user on `/sets` with existing sets
- **WHEN** they click "Generate with AI"
- **THEN** `AIGenerateModal` opens in a shadcn Dialog

### Requirement: Dual input modes

The modal SHALL provide two input modes:

1. Prompt tự do: textarea for prompt/document + slider card count (5-50, default 15)
2. Theo form: guided fields (language, learning content, optional topic, optional card count 5-200) that are composed client-side into a prompt before submit.
   **Constraint**: MUST
   **Verification**: Component test; slider value sent in API body.

#### Scenario: Submit generation request

- **GIVEN** user entered prompt and selected 20 cards
- **WHEN** they click submit
- **THEN** client POSTs `{ prompt, cardCount: 20 }` to `/api/v1/ai/generate-set`

#### Scenario: Submit freeform unlimited request

- **GIVEN** user is on "Prompt tự do" and checks "Không giới hạn số thẻ"
- **WHEN** they submit a valid prompt
- **THEN** client POSTs `{ prompt }` (no `cardCount`), allowing unlimited generation mode

#### Scenario: Submit guided generation request

- **GIVEN** user switches to "Theo form" and fills language/content/topic
- **WHEN** they submit with empty card count
- **THEN** client composes a prompt from guided fields and POSTs `{ prompt }` (no `cardCount`), allowing unlimited generation mode

#### Scenario: Slider default is 15

- **GIVEN** modal opens for the first time
- **WHEN** user has not changed the slider
- **THEN** submitted `cardCount` is 15

### Requirement: Client-side prompt validation

The modal SHALL block submit when prompt is empty or fewer than 10 characters after trim, showing an inline validation message without calling the API.
**Constraint**: MUST
**Verification**: Component test.

#### Scenario: Prompt too short blocked client-side

- **GIVEN** user entered a 5-character prompt
- **WHEN** they click submit
- **THEN** no API request is sent and an inline error is shown

### Requirement: Animated loading state

During API call (5–30s), the modal SHALL show a loading UI with rotating status messages (e.g. "Đang phân tích tài liệu...", "Đang trích xuất từ vựng...", "Đang hoàn thiện...").
**Constraint**: MUST
**Verification**: Component test with mocked pending state.

#### Scenario: Loading displayed

- **GIVEN** generation request in flight
- **WHEN** awaiting response
- **THEN** submit button disabled and loading messages animate

### Requirement: Read-only preview state

On success, the modal SHALL display a read-only preview of title, description, and card list (front/back/example). Users edit content on the set detail page after Confirm.
**Constraint**: MUST
**Verification**: Component test with mock API response.

#### Scenario: Preview after generation

- **GIVEN** API returns draft set with 10 cards
- **WHEN** response received
- **THEN** modal shows read-only preview with Confirm and Discard actions

### Requirement: API error handling in modal

The modal SHALL display a user-visible error (toast or inline) for API failures: 400 validation, 429 rate limit, 502 upstream AI failure, and network errors.
**Constraint**: MUST
**Verification**: Component tests with mocked error responses.

#### Scenario: Rate limit error shown

- **GIVEN** API returns 429 `RATE_LIMITED`
- **WHEN** response received
- **THEN** modal shows an error message and returns to the input form (draft not created)

#### Scenario: Upstream AI failure shown

- **GIVEN** API returns 502 due to Ollama timeout or invalid output
- **WHEN** response received
- **THEN** modal shows an error message and allows retry without navigation

### Requirement: Confirm navigation

On Confirm, the client SHALL navigate to `/sets/{setId}` using the returned set id. No additional API call on confirm (draft already saved).
**Constraint**: MUST
**Verification**: Integration/e2e test.

#### Scenario: User confirms draft

- **GIVEN** preview is shown for set `abc123`
- **WHEN** user clicks Confirm
- **THEN** router pushes to `/sets/abc123` and modal closes

### Requirement: Modal dismiss leaves draft

Closing the modal via Dialog X, Escape, or overlay click without Discard SHALL leave the PRIVATE draft in the database. User can delete it later from My Sets or the set detail page.
**Constraint**: MUST
**Verification**: Component test; documented in lifecycle spec.

#### Scenario: User closes modal without discard

- **GIVEN** preview is shown for draft set `xyz789`
- **WHEN** user closes the Dialog without clicking Discard
- **THEN** no DELETE is called and set `xyz789` remains in the user's sets list

### Requirement: Glassmorphism consistency

Modal styling SHALL match existing glass-panel design tokens (border, backdrop blur, rounded-2xl).
**Constraint**: SHOULD
**Verification**: Visual review against `SetsListClient` cards.

#### Scenario: Modal uses glass-panel styling

- **GIVEN** `AIGenerateModal` is rendered
- **WHEN** inspecting DialogContent class names
- **THEN** elements include `glass-panel` or equivalent glassmorphism utility classes used elsewhere in Sets UI

### Requirement: Accessibility

The modal SHALL trap focus while open and announce loading status via `aria-live="polite"`.
**Constraint**: SHOULD
**Verification**: Component a11y test or manual audit.

#### Scenario: Loading announced to screen readers

- **GIVEN** generation request in flight
- **WHEN** loading messages rotate
- **THEN** an `aria-live` region updates with the current status text

---

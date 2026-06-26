# ai-assistant-chat-box Specification

## Purpose

AI guide chat widget (Vietnamese) that helps users navigate the Flashcards website using auto-generated site knowledge (`guide-config.json`) and Ollama streaming. MVP scope: text guidance, deep links, in-memory session state, guest + authenticated context.

## Non-Goals (MVP)

- Vector DB / semantic RAG retrieval
- Đa ngôn ngữ (ngoài tiếng Việt)
- Highlight UI element, guided tour modal, agent thực hiện action thay user
- Lưu lịch sử chat cross-session hoặc analytics dashboard
- Fine-tuning model riêng
- Global distributed rate limiting (MVP: best-effort per serverless instance)

## Requirements

### Requirement: Guide Config Generation Pipeline

The system SHALL provide a build-time script that generates `src/generated/guide-config.json` by scanning application routes, navigation definitions, and merged hand-authored guide documents.
**Constraint**: MUST
**Verification**: Unit test `generate-guide-config.test.ts`; CI/build runs `npm run generate:guide`

#### Scenario: Scan app routes into config

- **GIVEN** page files exist under `src/app/**/page.tsx`
- **WHEN** `npm run generate:guide` executes
- **THEN** `guide-config.json` contains a `routes[]` entry for each discovered path with `path`, `title`, and `auth` inferred from route group (`(auth)` → public, `(app)` → required)

#### Scenario: Merge hand-authored flows and FAQ

- **GIVEN** `docs/guide/flows/*.json` and `docs/guide/faq.vi.json` exist
- **WHEN** the generator runs
- **THEN** output `flows[]` and `faq[]` include merged hand-authored content alongside auto-scanned data

#### Scenario: Config size guard

- **GIVEN** generated config exceeds `GUIDE_CONFIG_MAX_BYTES` (51200)
- **WHEN** the generator completes with `GUIDE_CONFIG_STRICT=true`
- **THEN** it exits non-zero and logs byte count

#### Scenario: Empty routes graceful

- **GIVEN** zero `page.tsx` files match the scan glob (early scaffold)
- **WHEN** the generator runs
- **THEN** it emits `routes: []` and exits zero with a warning (does not crash)

---

### Requirement: Guide Config Schema Validation

The system SHALL validate `guide-config.json` against a Zod schema covering `version`, `site`, `menus`, `routes`, `flows`, `faq`, and `guideTargets` before runtime use.
**Constraint**: MUST
**Verification**: Unit test `guide-config.schema.test.ts`

#### Scenario: Reject invalid config at load time

- **GIVEN** `guide-config.json` missing required `version` field
- **WHEN** `loadGuideConfig()` is called
- **THEN** it throws a typed `GuideConfigError` with code `INVALID_CONFIG`

---

### Requirement: Assistant Chat API

The system SHALL expose `POST /api/v1/assistant/chat` that accepts a message history and returns a streaming text response using Ollama via AI SDK `streamText` with `temperature: 0`.
**Constraint**: MUST
**Verification**: Unit test `assistant.service.test.ts`; integration test `assistant.chat.route.test.ts`

#### Scenario: Stream response for guest

- **GIVEN** an unauthenticated request with `{ messages: [{ role: "user", content: "Làm sao tạo bộ thẻ?" }] }`
- **WHEN** POST `/api/v1/assistant/chat`
- **THEN** response is `text/event-stream` and final text contains a markdown link matching `/sets/new` and at least one numbered step

#### Scenario: Inject user context for authenticated user

- **GIVEN** an authenticated user with 0 sets
- **WHEN** they ask "Tôi nên bắt đầu từ đâu?"
- **THEN** system prompt includes allow-listed `userContext` fields (`setCount`, `hasSets`, `recentSetIds`) and response suggests creating first set with link `/sets/new`

#### Scenario: Inject current pathname

- **GIVEN** request body includes optional `pathname: "/sets"`
- **WHEN** POST `/api/v1/assistant/chat`
- **THEN** system prompt includes current pathname for contextual guidance

#### Scenario: Reject empty messages

- **GIVEN** `{ messages: [] }`
- **WHEN** POST `/api/v1/assistant/chat`
- **THEN** API returns 400 `{ error: "VALIDATION_ERROR" }`

#### Scenario: Reject oversized message

- **GIVEN** a user message longer than `ASSISTANT_MAX_MESSAGE_CHARS` (500)
- **WHEN** POST `/api/v1/assistant/chat`
- **THEN** API returns 400 `{ error: "MESSAGE_TOO_LONG" }`

#### Scenario: Best-effort rate limit for guest

- **GIVEN** a guest IP exceeds `ASSISTANT_GUEST_RATE_LIMIT` (20) requests per hour on the same serverless instance
- **WHEN** POST `/api/v1/assistant/chat`
- **THEN** API returns 429 `{ error: "RATE_LIMITED" }`

#### Scenario: Ollama stream failure

- **GIVEN** `streamText` throws or returns an empty stream
- **WHEN** POST `/api/v1/assistant/chat`
- **THEN** API returns 503 `{ error: "ASSISTANT_UNAVAILABLE" }` with a Vietnamese error message in the stream or JSON body

#### Scenario: Client disconnect mid-stream

- **GIVEN** the client aborts the fetch while streaming
- **WHEN** the abort signal fires
- **THEN** the server cancels the Ollama stream without throwing an unhandled error

---

### Requirement: Out-of-Scope Question Handling

The assistant SHALL refuse questions unrelated to website usage and suggest 2–3 on-site topics in Vietnamese.
**Constraint**: MUST
**Verification**: Unit test `assistant.prompt.test.ts`

#### Scenario: Weather question refused

- **GIVEN** user asks "Thời tiết Hà Nội hôm nay thế nào?"
- **WHEN** assistant generates response
- **THEN** response declines politely in Vietnamese and suggests topics like creating sets or study modes

#### Scenario: Post-process blocks config exfiltration

- **GIVEN** model output contains raw JSON matching guide config structure or external URLs
- **WHEN** post-processing runs
- **THEN** external URLs are stripped and config-like blocks are not echoed verbatim to the client

---

### Requirement: Guide Chat Widget UI

The system SHALL render a floating chat widget at the bottom-right of all pages with expand/collapse and dismiss via in-memory React state (no `sessionStorage`/`localStorage`).
**Constraint**: MUST
**Verification**: Component test `GuideChatWidget.test.tsx`; Playwright `guide-chat.spec.ts`

#### Scenario: Widget visible by default

- **GIVEN** a fresh page load
- **WHEN** any page renders
- **THEN** the chat FAB is visible at bottom-right

#### Scenario: Dismiss hides widget during SPA navigation

- **GIVEN** user clicks the dismiss control beside the chat FAB (`aria-label` "Ẩn trợ lý hướng dẫn")
- **WHEN** they navigate to another route without full page reload
- **THEN** widget remains hidden

#### Scenario: Panel close keeps FAB visible

- **GIVEN** chat panel is expanded
- **WHEN** user clicks the panel header close control (`aria-label` "Đóng trợ lý") or presses Escape
- **THEN** panel collapses and the chat FAB is visible again (widget not fully dismissed)

#### Scenario: Refresh restores widget

- **GIVEN** user previously dismissed the widget
- **WHEN** they perform a full page reload (F5)
- **THEN** widget is visible again

#### Scenario: Mobile avoids bottom nav overlap

- **GIVEN** viewport width < 768px
- **WHEN** widget renders expanded
- **THEN** panel bottom offset is ≥ `GUIDE_CHAT_MOBILE_BOTTOM_OFFSET` (4rem) above viewport bottom

#### Scenario: Quick prompt chips

- **GIVEN** chat panel is expanded with empty history
- **WHEN** user views the input area
- **THEN** at least 3 Vietnamese quick-prompt chips are visible and submit on click

#### Scenario: Keyboard accessibility

- **GIVEN** chat panel is expanded
- **WHEN** user presses Escape
- **THEN** panel collapses and focus returns to the FAB

#### Scenario: Screen reader labels

- **GIVEN** the chat FAB renders
- **WHEN** inspected for accessibility
- **THEN** it has a Vietnamese `aria-label` (e.g. "Mở trợ lý hướng dẫn")

---

### Requirement: Safe Markdown Rendering

The client SHALL render assistant markdown using an allow-list: internal links only, no raw HTML, no `javascript:`/`data:` URIs.
**Constraint**: MUST
**Verification**: Unit test `GuideChatMessage.test.tsx`

#### Scenario: Strip javascript URI

- **GIVEN** assistant message contains `[click](javascript:alert(1))`
- **WHEN** rendered in `GuideChatMessage`
- **THEN** output shows plain text without a clickable link

#### Scenario: Strip external links

- **GIVEN** assistant message contains `[Google](https://google.com)`
- **WHEN** rendered
- **THEN** external link is not clickable (plain text or removed)

---

### Requirement: Deep Link in Assistant Responses

Assistant responses SHALL include valid internal markdown links only to paths declared in `guide-config.json.routes`.
**Constraint**: MUST
**Verification**: Unit test `assistant.links.test.ts`

#### Scenario: Valid link preserved

- **GIVEN** config contains route `/sets/new`
- **WHEN** model outputs `[Tạo bộ thẻ](/sets/new)`
- **THEN** link is passed through unchanged to client

#### Scenario: Invalid link stripped

- **GIVEN** model outputs `[Admin](/admin/secret)`
- **WHEN** post-processing runs
- **THEN** invalid link is replaced with plain text label only

---

### Requirement: Guide Action Skeleton

The system SHALL define a discriminated union `GuideAction` (`navigate` | `highlight` | `openModal` | `execute`) and `GuideActionContext` with noop default implementations.
**Constraint**: MUST
**Verification**: Unit test `guide-actions.test.ts`

#### Scenario: Noop handler safe at MVP

- **GIVEN** `GuideActionProvider` with default noop handlers
- **WHEN** `highlight("sidebar-sets")` is called
- **THEN** no DOM mutation occurs and no error is thrown

#### Scenario: Config includes guideTargets

- **GIVEN** generated config after navigation refactor
- **WHEN** loaded
- **THEN** `guideTargets[]` contains entries with `id`, `selector`, and `label` for each main nav item

---

### Requirement: Shared Navigation Source

The system MUST centralize nav items in `src/lib/navigation-data.ts` consumed by Sidebar, MobileNav, and config generator.
**Constraint**: MUST
**Verification**: Unit test `navigation.test.ts`; generator output matches Sidebar labels

#### Scenario: Single nav source

- **GIVEN** `src/lib/navigation-data.ts` exports `APP_NAV_ITEMS`
- **WHEN** Sidebar and generator both import it
- **THEN** menu labels in config match Sidebar UI labels

---

### Requirement: Root Layout Provider Mount

The root layout SHALL mount `GuideChatProvider` wrapping the application so the widget is available on public, auth, and app routes without breaking existing providers (theme, toaster).
**Constraint**: MUST
**Verification**: Playwright `guide-chat.spec.ts`

#### Scenario: Widget on landing page

- **GIVEN** unauthenticated user on `/`
- **WHEN** page renders
- **THEN** chat FAB is visible

#### Scenario: Widget on login page

- **GIVEN** unauthenticated user on `/login`
- **WHEN** page renders
- **THEN** chat FAB is visible

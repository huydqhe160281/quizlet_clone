# Specification: Flashcard Management

## Capability Summary
Người dùng có thể tạo, chỉnh sửa, xóa, duplicate bộ Flashcard và các card trong đó — bao gồm upload image/audio tùy chọn cho mỗi card, quản lý tags và folders.

## Layer Map

| Layer | Component | Symbol / Path |
|---|---|---|
| UI | Pages | `src/app/(app)/sets/` — list, detail, new, edit pages |
| UI | Components | `src/features/sets/components/`, `src/features/cards/components/` |
| UI | Hooks | `src/features/sets/hooks/`, `src/features/cards/hooks/` |
| API | Route Handlers | `src/app/api/v1/sets/`, `/folders/`, `/tags/`, `/upload/` |
| Service | CRUD | `src/server/services/sets/set.service.ts`, `card.service.ts` |
| Service | Media | `src/server/services/upload.service.ts` |
| DB | Tables | `FlashcardSet`, `Flashcard`, `Tag`, `SetTag`, `Folder`, `FolderSet` |
| Validation | Schemas | `src/features/sets/schemas/set.schema.ts`, `src/features/cards/schemas/card.schema.ts` |

---

## ADDED Requirements

### Requirement: FlashcardSet CRUD
The system SHALL allow authenticated users to create, read, update, and delete their own FlashcardSets.
**Constraint**: MUST
**Verification**: Integration tests `sets/crud.test.ts`

#### Scenario: Create Set with Metadata
- **GIVEN** an authenticated user
- **WHEN** they submit title="English Vocab" (required, max 200 chars), description="A1-B1 words" (optional, max 1000 chars), language="en"
- **THEN** a new FlashcardSet is created with `userId = current user`, `visibility = PRIVATE`, description and language stored

#### Scenario: Create Set — Title Too Long
- **GIVEN** an authenticated user
- **WHEN** they submit a title with 201 characters
- **THEN** the API returns 400 `{ error: "VALIDATION_ERROR", field: "title" }`

#### Scenario: Unauthorized Update
- **GIVEN** user A owns set X
- **WHEN** user B sends PATCH `/api/v1/sets/X`
- **THEN** the API returns 403 `{ error: "FORBIDDEN" }` and set X is unchanged

#### Scenario: Delete Cascade
- **GIVEN** a FlashcardSet with 50 cards
- **WHEN** the owner deletes the set
- **THEN** all 50 Flashcard records, SetTag records, CardProgress records, and ReviewHistory records are deleted (Prisma cascade)

---

### Requirement: Duplicate Set
The system SHALL allow any authenticated user to duplicate any set (public or their own) into their own account.
**Constraint**: MUST
**Verification**: Integration test `sets/duplicate.test.ts`

#### Scenario: Duplicate Public Set
- **GIVEN** a public set owned by user A with 10 cards
- **WHEN** user B calls POST `/api/v1/sets/:id/duplicate`
- **THEN** a new FlashcardSet with `userId = B` is created, with 10 new Flashcard copies; original set is unchanged; `visibility = PRIVATE` for the duplicate

---

### Requirement: Card CRUD with Media
The system SHALL allow set owners to add/edit/delete cards with optional image and audio fields.
**Constraint**: MUST
**Verification**: Integration tests `cards/media-upload.test.ts`

#### Scenario: Add Card — Front and Back Required
- **GIVEN** an authenticated user owning a set
- **WHEN** they submit a new card with `front = "apple"` (max 500 chars) and `back = "quả táo"` (max 500 chars)
- **THEN** a Flashcard is created with both fields stored; `setId` matches the owning set

#### Scenario: Add Card — Missing Front
- **GIVEN** an authenticated user owning a set
- **WHEN** they submit a new card with empty `front` field
- **THEN** the API returns 400 `{ error: "VALIDATION_ERROR", field: "front" }`

#### Scenario: Add Card with Image
- **GIVEN** an authenticated user owning a set
- **WHEN** they upload an image (< 5MB, type image/*) via `/api/v1/upload/presigned-url` then create a card with the returned `path`
- **THEN** the Flashcard is created with `imageUrl = storage-path`, and the public URL is accessible via Supabase Storage

#### Scenario: File Size Violation
- **GIVEN** a user attempting to upload an image > 5MB
- **WHEN** they request a presigned URL with `fileSize > 5_242_880`
- **THEN** the API returns 400 `{ error: "FILE_TOO_LARGE" }` before generating any presigned URL

#### Scenario: Invalid MIME Type
- **GIVEN** a user attempting to upload a `.exe` file
- **WHEN** they request presigned URL with `mimeType = "application/x-msdownload"`
- **THEN** the API returns 400 `{ error: "INVALID_MIME_TYPE" }`

#### Scenario: Add Card with Audio
- **GIVEN** an authenticated user owning a set
- **WHEN** they upload an audio file (< 10MB, type `audio/mpeg` or `audio/wav`) via presigned URL then create a card with the returned `path`
- **THEN** the Flashcard is created with `audioUrl = storage-path`; allowed MIME types: `audio/mpeg`, `audio/wav`, `audio/ogg`

#### Scenario: Audio File Too Large
- **GIVEN** a user attempting to upload an audio file > 10MB
- **WHEN** they request a presigned URL with `fileSize > 10_485_760`
- **THEN** the API returns 400 `{ error: "FILE_TOO_LARGE", details: { maxBytes: 10485760 } }`

#### Scenario: Card with Example Field
- **GIVEN** a card being created with all optional fields
- **WHEN** the user provides `example = "She ate an apple."` (max 1000 chars)
- **THEN** the Flashcard is created with `example` stored; example is displayed in study modes below the back text

#### Scenario: Example Field Validation
- **GIVEN** a card being created with `example` exceeding 1000 characters
- **WHEN** the form is submitted
- **THEN** Zod validation returns 400 with field-level error before any DB operation

---

### Requirement: Card Reorder
The system SHALL allow set owners to reorder cards via drag-and-drop (updating `sortOrder`).
**Constraint**: SHOULD
**Verification**: Integration test `cards/reorder.test.ts`

#### Scenario: Reorder Cards
- **GIVEN** a set with cards [A(0), B(1), C(2)]
- **WHEN** user calls POST `/api/v1/sets/:id/cards/reorder` with `{ order: ["C", "A", "B"] }`
- **THEN** cards are updated to [C(0), A(1), B(2)] in a single transaction

---

### Requirement: Visibility Control
The system SHALL allow set owners to toggle visibility between PRIVATE and PUBLIC.
**Constraint**: MUST

#### Scenario: Make Set Public
- **GIVEN** a private set
- **WHEN** owner changes visibility to PUBLIC
- **THEN** the set appears in Public Library and search results (within ISR revalidation window)

---

### Requirement: Tag & Folder Management
The system SHALL allow users to organize sets with tags and folders.
**Constraint**: SHOULD

#### Scenario: Add Tag to Set
- **GIVEN** an existing tag "vocabulary"
- **WHEN** user adds it to their set
- **THEN** a SetTag junction record is created; the set appears in filter `?tagId=vocabulary`

---

## Out of Scope
- Import from Quizlet CSV/API
- Collaborative editing (multi-user simultaneous edit)
- Version history / undo for card edits
- Bulk delete (delete all cards at once)

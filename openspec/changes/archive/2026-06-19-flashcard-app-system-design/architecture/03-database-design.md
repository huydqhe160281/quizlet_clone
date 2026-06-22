# Database Design

## 1. ERD (Entity Relationship Diagram)

```
┌──────────────────────────────────────────────────────────────────────┐
│                        ERD Overview                                  │
│                                                                      │
│  User ──1──< FlashcardSet ──1──< Flashcard                          │
│    │                │                 │                              │
│    │                │                 └──1──< CardProgress           │
│    │                │                 └──*──< ReviewHistory          │
│    │                └──*──< SetTag ──>── Tag                        │
│    │                └──*──< FolderSet ──>── Folder                  │
│    │                                                                 │
│    └──1──< UserStats                                                 │
│    └──1──< StudySession ──1──< SessionCard                          │
│    └──*──< Folder                                                    │
└──────────────────────────────────────────────────────────────────────┘
```

## 2. Prisma Schema đầy đủ

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_DATABASE_URL")
}

// ─────────────────────────── ENUMS ─────────────────────────────

enum Visibility {
  PRIVATE
  PUBLIC
}

enum StudyMode {
  FLASHCARD
  LEARN
  WRITE
  TEST
}

enum Grade {
  AGAIN  // 0 — complete blackout
  HARD   // 1 — incorrect, remembered after hint
  GOOD   // 2 — correct with effort
  EASY   // 3 — correct, easy
}

// ─────────────────────────── USER ──────────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  passwordHash  String?   // null nếu OAuth only
  emailVerified DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts       Account[]
  sessions       Session[]
  sets           FlashcardSet[]
  folders        Folder[]
  studySessions  StudySession[]
  stats          UserStats?
  cardProgress   CardProgress[]    // inverse relation
  reviewHistory  ReviewHistory[]   // inverse relation

  @@index([email])
  @@map("users")
}

// NextAuth Account (OAuth providers)
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
  @@map("accounts")
}

// NextAuth Session
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("sessions")
}

// NextAuth Verification Token (email verify / password reset)
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@id([identifier, token])  // Prisma 5 requires a primary key on every model
  @@map("verification_tokens")
}

// ─────────────────────────── FOLDER ────────────────────────────

model Folder {
  id        String   @id @default(cuid())
  name      String
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  sets FolderSet[]

  @@index([userId])
  @@map("folders")
}

model FolderSet {
  folderId String
  setId    String

  folder Folder       @relation(fields: [folderId], references: [id], onDelete: Cascade)
  set    FlashcardSet @relation(fields: [setId], references: [id], onDelete: Cascade)

  @@id([folderId, setId])
  @@map("folder_sets")
}

// ─────────────────────────── TAG ───────────────────────────────

model Tag {
  id   String @id @default(cuid())
  name String @unique

  sets SetTag[]

  @@index([name])
  @@map("tags")
}

model SetTag {
  setId String
  tagId String

  set FlashcardSet @relation(fields: [setId], references: [id], onDelete: Cascade)
  tag Tag          @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([setId, tagId])
  @@map("set_tags")
}

// ─────────────────────────── FLASHCARD SET ─────────────────────

model FlashcardSet {
  id          String     @id @default(cuid())
  title       String
  description String?    @db.Text
  language    String?    // ISO 639-1 code, e.g., "en", "vi"
  visibility  Visibility @default(PRIVATE)
  coverImage  String?    // Supabase Storage path
  userId      String
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  // Full-text search vector (PostgreSQL tsvector) — @map ensures Prisma targets correct column
  searchVector Unsupported("tsvector")? @map("search_vector")

  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  cards         Flashcard[]
  tags          SetTag[]
  folders       FolderSet[]
  studySessions StudySession[]

  @@index([userId])
  @@index([visibility])
  @@index([language])
  @@index([createdAt(sort: Desc)])
  // Full-text search index (created via raw migration)
  // CREATE INDEX sets_search_idx ON flashcard_sets USING GIN(search_vector);
  @@map("flashcard_sets")
}

// ─────────────────────────── FLASHCARD ─────────────────────────

model Flashcard {
  id          String   @id @default(cuid())
  setId       String
  front       String   @db.Text
  back        String   @db.Text
  example     String?  @db.Text
  imageUrl    String?  // Supabase Storage path
  audioUrl    String?  // Supabase Storage path
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  set           FlashcardSet   @relation(fields: [setId], references: [id], onDelete: Cascade)
  progress      CardProgress[]
  reviewHistory ReviewHistory[]
  sessionCards  SessionCard[]

  @@index([setId])
  @@index([setId, sortOrder])
  @@map("flashcards")
}

// ─────────────────────────── CARD PROGRESS (SM-2) ──────────────

model CardProgress {
  id           String   @id @default(cuid())
  userId       String
  cardId       String
  easeFactor   Float    @default(2.5)  // SM-2 E-Factor (min 1.3)
  interval     Int      @default(0)    // days until next review
  repetitions  Int      @default(0)    // consecutive correct reviews
  dueDate      DateTime @default(now())
  reviewCount  Int      @default(0)
  lastReviewed DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // FK tới User — đảm bảo referential integrity; cascade delete khi user bị xóa
  user User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  card Flashcard @relation(fields: [cardId], references: [id], onDelete: Cascade)

  @@unique([userId, cardId])
  @@index([userId, dueDate])    // Critical: query due cards per user
  @@index([cardId])
  @@map("card_progress")
}

// ─────────────────────────── REVIEW HISTORY ────────────────────

model ReviewHistory {
  id         String   @id @default(cuid())
  userId     String
  cardId     String
  grade      Grade
  reviewedAt DateTime @default(now())
  responseMs Int?     // milliseconds to answer (UX metric)

  // FK tới User — cascade delete khi user bị xóa
  user User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  card Flashcard @relation(fields: [cardId], references: [id], onDelete: Cascade)

  @@index([userId, reviewedAt(sort: Desc)])
  @@index([cardId])
  @@map("review_history")
}

// ─────────────────────────── STUDY SESSION ─────────────────────

model StudySession {
  id          String    @id @default(cuid())
  userId      String
  setId       String
  mode        StudyMode
  startedAt   DateTime  @default(now())
  completedAt DateTime?
  totalCards  Int       @default(0)
  correctCount Int      @default(0)
  score       Float?    // 0.0 - 1.0 accuracy

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  set          FlashcardSet  @relation(fields: [setId], references: [id], onDelete: Cascade)
  sessionCards SessionCard[]

  @@index([userId, startedAt(sort: Desc)])
  @@index([setId])
  @@map("study_sessions")
}

model SessionCard {
  id        String  @id @default(cuid())
  sessionId String
  cardId    String
  isCorrect Boolean?
  grade     Grade?
  answeredAt DateTime?

  session StudySession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  card    Flashcard    @relation(fields: [cardId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@map("session_cards")
}

// ─────────────────────────── USER STATS ────────────────────────

model UserStats {
  id              String   @id @default(cuid())
  userId          String   @unique
  currentStreak   Int      @default(0)
  longestStreak   Int      @default(0)
  totalReviews    Int      @default(0)
  totalCorrect    Int      @default(0)
  lastStudiedDate DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_stats")
}
```

## 3. Index Strategy

### Critical Indexes (hiệu năng cao nhất)

| Index | Bảng | Cột | Query Pattern | Lý do |
|---|---|---|---|---|
| `card_progress_user_due` | `card_progress` | `(userId, dueDate)` | Lấy due cards | Query SM-2 most frequent |
| `sets_user_idx` | `flashcard_sets` | `userId` | Lấy sets của user | Mọi page load dashboard |
| `sets_visibility_idx` | `flashcard_sets` | `visibility` | Public library | Browse public sets |
| `sets_search_idx` | `flashcard_sets` | `searchVector` (GIN) | Full-text search | Search sets |
| `cards_set_order_idx` | `flashcards` | `(setId, sortOrder)` | Lấy cards trong set | Paginated card list |
| `review_history_user_idx` | `review_history` | `(userId, reviewedAt DESC)` | Dashboard history | Activity heatmap |
| `sessions_user_idx` | `study_sessions` | `(userId, startedAt DESC)` | Recent sessions | Dashboard |

### Full-Text Search Setup (PostgreSQL)

```sql
-- Migration: add full-text search to flashcard_sets
ALTER TABLE flashcard_sets ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Trigger để tự động cập nhật search_vector
CREATE OR REPLACE FUNCTION update_set_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description
  ON flashcard_sets
  FOR EACH ROW EXECUTE FUNCTION update_set_search_vector();

-- GIN index
CREATE INDEX sets_search_idx ON flashcard_sets USING GIN(search_vector);

-- Query example
SELECT * FROM flashcard_sets
WHERE search_vector @@ plainto_tsquery('english', 'input_query')
  AND visibility = 'PUBLIC'
ORDER BY ts_rank(search_vector, plainto_tsquery('english', 'input_query')) DESC
LIMIT 20;
```

## 4. N+1 Query Prevention

**Vấn đề phổ biến:**
```typescript
// ❌ N+1 anti-pattern
const sets = await prisma.flashcardSet.findMany({ where: { userId } });
for (const set of sets) {
  const cards = await prisma.flashcard.findMany({ where: { setId: set.id } }); // N queries!
}

// ✅ Correct: include relation
const sets = await prisma.flashcardSet.findMany({
  where: { userId },
  include: {
    _count: { select: { cards: true } },
    tags: { include: { tag: true } },
  },
});
```

## 5. Database Migration Strategy

```
prisma/
├── schema.prisma          # Single source of truth
├── migrations/
│   ├── 20240101_init/
│   │   └── migration.sql  # Initial tables
│   ├── 20240115_full_text/
│   │   └── migration.sql  # Add tsvector + trigger
│   └── ...
└── seed.ts               # Seed data cho dev
```

**Quy tắc:** Không bao giờ sửa migration cũ. Luôn tạo migration mới.

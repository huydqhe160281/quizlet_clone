# Software Requirements Specification (SRS)
# Flashcard App — flashcard-app-system-design

**Version**: 1.0 | **Status**: Draft | **Date**: 2026-06-16

---

## 1. Introduction

### 1.1 Purpose
Tài liệu này mô tả yêu cầu chức năng và phi chức năng cho ứng dụng học Flashcard lấy cảm hứng từ Quizlet, được xây dựng với Next.js 15 + Supabase + Vercel.

### 1.2 Scope
Ứng dụng web cho phép người dùng tạo, quản lý, và học Flashcard với 4 chế độ học + spaced repetition (SM-2). Hỗ trợ Public Library để chia sẻ bộ học.

### 1.3 Definitions
- **FlashcardSet**: Bộ flashcard chứa nhiều Flashcard
- **Flashcard**: Đơn vị học gồm front/back/image/audio/example
- **SM-2**: SuperMemo 2 — thuật toán spaced repetition
- **Due Card**: Card có `dueDate <= NOW()` theo SM-2
- **Session**: Một lần học hoàn chỉnh của một study mode

---

## 2. Functional Requirements

### FR-01: Authentication
| ID | Requirement | Priority |
|---|---|---|
| FR-01-1 | System SHALL support email/password registration | MUST |
| FR-01-2 | System SHALL support Google OAuth login | MUST |
| FR-01-3 | System SHALL support password reset via email token (TTL 1h) | MUST |
| FR-01-4 | System SHALL protect routes `/dashboard`, `/sets`, `/study` from unauthenticated access | MUST |
| FR-01-5 | Passwords SHALL be hashed with bcrypt (rounds ≥ 12) | MUST |

### FR-02: FlashcardSet Management
| ID | Requirement | Priority |
|---|---|---|
| FR-02-1 | Authenticated users SHALL create, read, update, delete their sets | MUST |
| FR-02-2 | Sets SHALL have: title (required, max 200), description (max 1000), language, visibility (PRIVATE/PUBLIC) | MUST |
| FR-02-3 | Users SHALL be able to duplicate any accessible set into their account | MUST |
| FR-02-4 | Users SHALL be able to add tags and organize sets into folders | SHOULD |
| FR-02-5 | Only set owners SHALL be able to modify or delete their sets | MUST |

### FR-03: Flashcard Management
| ID | Requirement | Priority |
|---|---|---|
| FR-03-1 | Set owners SHALL add/edit/delete cards within their sets | MUST |
| FR-03-2 | Each card SHALL support: front (required), back (required), example (optional), image (optional), audio (optional) | MUST |
| FR-03-3 | Image uploads SHALL be limited to 5MB; audio to 10MB | MUST |
| FR-03-4 | Cards SHALL be reorderable via drag-and-drop | SHOULD |
| FR-03-5 | Media uploads SHALL use presigned URLs (client → Supabase directly) | MUST |

### FR-04: Study Modes
| ID | Requirement | Priority |
|---|---|---|
| FR-04-1 | Flashcard Mode: 3D flip animation, keyboard shortcuts (Space/Arrow), mobile swipe | MUST |
| FR-04-2 | Learn Mode: Present card front as question, accept answer (multi-choice or input) | MUST |
| FR-04-3 | Write Mode: Accept typed answer, evaluate with fuzzy matching (Jaro-Winkler ≥ 0.85) | MUST |
| FR-04-4 | Test Mode: Generate test with MC (1+3 distractors), True/False, Typing questions | MUST |
| FR-04-5 | All study sessions SHALL be recorded in DB with accuracy score | MUST |

### FR-05: Spaced Repetition
| ID | Requirement | Priority |
|---|---|---|
| FR-05-1 | System SHALL implement SM-2 algorithm for scheduling card reviews | MUST |
| FR-05-2 | Each card SHALL track: easeFactor, interval, repetitions, dueDate, reviewCount | MUST |
| FR-05-3 | System SHALL expose endpoint to get all due cards for current user | MUST |
| FR-05-4 | Review submission SHALL update CardProgress and create ReviewHistory record | MUST |
| FR-05-5 | Ease factor SHALL never fall below 1.3 | MUST |

### FR-06: Dashboard
| ID | Requirement | Priority |
|---|---|---|
| FR-06-1 | Dashboard SHALL show: current streak, longest streak, total reviews, accuracy | MUST |
| FR-06-2 | Dashboard SHALL show daily activity for last 365 days (heatmap data) | MUST |
| FR-06-3 | Dashboard SHALL show count of due cards with link to study page | MUST |
| FR-06-4 | Dashboard SHALL show 5 most recent study sessions | SHOULD |

### FR-07: Search
| ID | Requirement | Priority |
|---|---|---|
| FR-07-1 | Users SHALL search FlashcardSets by title/description using full-text search | MUST |
| FR-07-2 | Search results SHALL be filterable by language and tag | SHOULD |
| FR-07-3 | Search SHALL cover public sets and the user's own private sets | MUST |
| FR-07-4 | Empty search query SHALL return 400 error | MUST |

### FR-08: Public Library
| ID | Requirement | Priority |
|---|---|---|
| FR-08-1 | Public Library SHALL list all public sets with 3 sort options | MUST |
| FR-08-2 | Sort options: newest (default), most_studied, trending (last 7 days activity) | MUST |
| FR-08-3 | Library page SHALL be ISR-cached with 5-minute revalidation | MUST |
| FR-08-4 | Any user SHALL duplicate a public set to their own account | MUST |

---

## 3. Non-Functional Requirements

### NFR-01: Performance
- Lighthouse Performance score ≥ 90 (mobile + desktop)
- TTFB < 200ms for main pages
- LCP < 2.5s
- CLS < 0.1

### NFR-02: Security
- All API inputs validated with Zod
- Rate limiting on all mutation endpoints
- CSRF protection via SameSite=Lax cookies
- CSP headers in production
- SQL injection prevention via Prisma parameterized queries

### NFR-03: Scalability
- Connection pooling via Supabase PgBouncer (port 6543)
- Architecture supports scale to 10K users without core refactor

### NFR-04: Maintainability
- TypeScript strict mode
- Feature-based folder structure
- Service layer isolation (no direct Prisma in route handlers)
- Unit test coverage ≥ 80% for business logic (SM-2, services)

### NFR-05: Deployment
- All features deployable on Vercel free/hobby tier
- Database migrations run automatically in Vercel build step
- Environment variables documented in README

---

## 4. Constraints

- Stack is fixed: Next.js 15 + TypeScript + Prisma + Supabase + NextAuth + Vercel
- No Redis, no queue service, no separate backend server
- Personal project scale: < 100 users initially

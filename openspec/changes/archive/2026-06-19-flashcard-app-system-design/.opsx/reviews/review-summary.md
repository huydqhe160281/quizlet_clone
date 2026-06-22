# Review Summary — flashcard-app-system-design
**Iteration**: 3 | **Status**: **SATURATED** | **Date**: 2026-06-17

---

## QuorumResult (Iteration 1)

```json
{
  "summary_status": "pending_revision",
  "iteration": 1,
  "agents": ["B1-Skeptic", "B2-Guardian", "B3-Advocate", "B4-Codebase"],
  "total_fails": 28,
  "total_warnings": 28,
  "total_pass": 30
}
```

## QuorumResult (Iteration 2)

```json
{
  "summary_status": "approved",
  "iteration": 2,
  "agents": ["B1-Skeptic", "B2-Guardian", "B3-Advocate", "B4-Codebase"],
  "critical_fails_remaining": 0,
  "accepted_warnings": 12,
  "total_pass": 40,
  "saturation": true
}
```

## QuorumResult (Iteration 3)

```json
{
  "summary_status": "saturated",
  "iteration": 3,
  "agents": ["B1-Skeptic", "B2-Guardian", "B3-Advocate", "B4-Codebase"],
  "dispatch_method": "IDE Subagent Fallback (kit personas not in registry)",
  "iteration_3_fails_found": 15,
  "iteration_3_fails_fixed": 15,
  "critical_fails_remaining": 0,
  "accepted_warnings": 8,
  "post_fix_cli_validate": "passed",
  "saturation": true
}
```

---

## Fixes Applied (Iteration 1 → Revision)

### CRITICAL (B4 + B2) — Fixed
| Issue | File | Fix |
|---|---|---|
| `getServerSession()` → `auth()` (NextAuth v5) | `02-system-architecture.md`, `04-api-design.md` | Updated to `await auth()` |
| url/directUrl comments swapped | `02-system-architecture.md` | Corrected: `url` = pooled (6543), `directUrl` = direct (5432) |
| Route collision (app)/sets/[setId] vs (public)/sets/[setId] | `05-folder-structure.md` | Renamed public route to `/shared/[setId]` |
| Next.js 15 async params not awaited | `06-performance-strategy.md` | Added `const { setId } = await params` pattern |
| Cursor pagination missing `skip: 1` | `04-api-design.md` | Added `skip: cursor ? 1 : 0` |
| RSC bypassing service layer | `02-system-architecture.md` | Updated diagram to use service layer methods |
| Missing `middleware.ts` in folder tree | `05-folder-structure.md` | Added at root of `src/` |
| Register endpoint missing (NextAuth Credentials = sign-in only) | `04-api-design.md` | Added `POST /api/v1/auth/register` |

### SPEC GAPS (B1) — Fixed
| Issue | File | Fix |
|---|---|---|
| Missing Email Login requirement+GWT | `specs/authentication/spec.md` | Added full requirement with 3 scenarios |
| Missing T/F and Typing scenarios in Test Mode | `specs/study-modes/spec.md` | Added 2 scenarios |
| Missing audio upload scenarios | `specs/flashcard-management/spec.md` | Added audio size/MIME scenarios |
| Missing card `example` field scenarios | `specs/flashcard-management/spec.md` | Added example create + validation scenarios |

### PIPELINE GAPS (B3) — Fixed
| Issue | File | Fix |
|---|---|---|
| App shell/layout has no tasks | `tasks.md` Phase 1 | Added 3 tasks |
| Email delivery (Resend) not in tasks | `tasks.md` Phase 2 | Added Resend install + template + env tasks |
| Auth test files not in tasks | `tasks.md` Phase 2 | Added 4 missing test file tasks |
| Phase 6 missing Phase 4 dependency | `decomposition.md` | Updated deps to include Phase 4 |

---

## Remaining Issues (Accepted Trade-offs / Deferred)

### Accepted as Trade-offs (personal project scale):
- **In-memory rate limiting** (B2): Per-serverless-instance LRU is a known limitation. For < 100 users, probability of concurrent instances is negligible. Upgrade path: Upstash Redis when needed.
- **DDD repository pattern absent** (B2): Next.js projects conventionally use Service → Prisma without a separate Repository abstraction layer. This is idiomatic for this stack. NFR "maintainability" is satisfied by service layer isolation.
- **CSP `unsafe-eval`** (B2): Required by Next.js dev mode. Production-mode Next.js next.config.ts can be tightened with nonce-based CSP; documented as post-MVP optimization.
- **JWT 30-day TTL** (B2): Accepted trade-off per Decision 4 in design-brief. Short-lived JWT (30 min) + refresh is listed as upgrade path.
- **30-day timeline aggressive** (B3): Solo project; timeline is aspirational. Phase 4 (4 study modes) and Phase 5 (SM-2) can be extended.
- **SM-2 AGAIN ease formula simplified** (B4): `easeFactor - 0.2` is the Anki variant, not canonical SM-2 formula. Acknowledged in design-brief Decision 4.

### Deferred (post-MVP):
- **Topic filter** (B1/B3): "Topic" is synonymous with "Tag" in this design. Closing this gap by using tags for topic categorization.
- **Settings page** (B3): Out of MVP scope — not included in any spec. Remove from middleware protected routes list.
- **NFR coverage threshold CI gate** (B1): Add to Phase 8 as `pnpm jest --coverage --coverageThreshold=...`
- **Vercel Analytics setup task** (B1): Add to Phase 0/8 tasks
- **SM-2 HARD grade behavior** (B4): Spec left ambiguous (Anki-style hard pass = interval unchanged, ease decreases). Implementer should follow Anki convention.

---

## Fixes Applied (Iteration 2 → Revision)

### CRITICAL (B2 + B4) — Fixed
| Issue | File | Fix |
|---|---|---|
| `User` model missing inverse relations `cardProgress[]`, `reviewHistory[]` | `03-database-design.md` | Added both inverse relation fields |
| `VerificationToken` missing primary key | `03-database-design.md` | Changed `@@unique` to `@@id([identifier, token])` |
| `searchVector` missing `@map("search_vector")` | `03-database-design.md` | Added `@map` annotation |
| `getServerSession` remnant in auth flow diagram | `02-system-architecture.md` | Updated to `await auth()` |
| `getServerSession` remnant in auth.ts comment | `05-folder-structure.md` | Updated comment to NextAuth v5 API |
| `getServerSession` remnant in basic design | `system_docs/basic_design/flashcard-app-basic-design.md` | Updated to `await auth()` |
| Password reset path `POST /api/auth/forgot-password` | `02-system-architecture.md` | Standardized to `/api/v1/auth/forgot-password` |
| `register/route.ts` missing from folder tree | `05-folder-structure.md` | Added `register/`, `reset-password/` routes |
| Missing `reset-password/page.tsx` in auth routes | `05-folder-structure.md` | Added page to `(auth)` route group |

### SPEC GAPS (B1) — Fixed
| Issue | File | Fix |
|---|---|---|
| Set metadata (description, language) missing GWT | `specs/flashcard-management/spec.md` | Added 2 metadata scenarios (create + title too long) |
| Card front/back field GWT missing | `specs/flashcard-management/spec.md` | Added front/back required + missing-front error scenarios |
| Search tag filter scenario missing | `specs/dashboard-search-library/spec.md` | Added `Scenario: Search with Tag Filter` |
| Dashboard stats GWT (accuracy, counts) missing | `specs/dashboard-search-library/spec.md` | Added stats display + zero-state scenarios |
| Recent Sessions requirement missing | `specs/dashboard-search-library/spec.md` | Added full requirement with 2 GWT scenarios |
| Auth register verification path wrong | `specs/authentication/spec.md` | Fixed to `POST /api/v1/auth/register` |
| Auth Layer Map missing register endpoint + reset-password page | `specs/authentication/spec.md` | Updated Layer Map |
| SM-2 HARD grade behavior underspecified | `specs/spaced-repetition/spec.md` | Added `Scenario: HARD grade — Reduced Interval` with explicit formula |
| `fileSize` missing from presigned URL request body | `04-api-design.md` | Added `fileSize: number` field |

### PIPELINE GAPS (B3) — Fixed
| Issue | File | Fix |
|---|---|---|
| Public set preview task uses wrong route `/sets/[setId]` | `tasks.md` Phase 7 | Corrected to `src/app/(public)/shared/[setId]/page.tsx` |
| Verification checklist auth count wrong (5 → 6) | `tasks.md` Phase 8 | Updated to reference all 6 requirements |
| SM-2 second review unit test missing | `tasks.md` Phase 5 | Added `test_sm2_second_review_good()` |
| Trending sort test missing in library | `tasks.md` Phase 7 | Added `test_library_trending_sort()` task |

---

## Fixes Applied (Iteration 3 → Revision)

### CRITICAL — Fixed (15 FAILs across B1–B4)
| Issue | File(s) | Fix |
|---|---|---|
| API route tree nesting broke `/api/v1/` contract | `05-folder-structure.md` | Moved all API routes under `api/v1/`; fixed indentation; added `auth/me/route.ts` |
| `GET /api/v1/auth/me` missing from folder tree | `05-folder-structure.md` | Added `me/route.ts` |
| Stale public preview `/sets/[setId]` | `decomposition.md`, `01-product-architecture.md` | Standardized to `/shared/[setId]` |
| Phase 7 missing Phase 4 dependency | `decomposition.md` | Added Phase 4 for most_studied/trending sorts |
| SM-2 `grade < 2` contradicted spec | `08-deployment-roadmap.md` | Split AGAIN vs HARD branches per spec |
| Description limit drift (1000 vs 2000) | `04-api-design.md`, `flashcard-app-srs.md` | Standardized to max 1000 chars |
| Search tag param inconsistency (`tag` vs `tagId`) | `dashboard-search-library/spec.md` | Standardized to `tagId` |
| Dashboard missing "cards studied" metric | `dashboard-search-library/spec.md` | Added `cardsStudied` to requirement + GWT |
| Middleware missing `callbackUrl` | `07-security-strategy.md` | Added `callbackUrl` query param on redirect |
| Reset-password UI page missing from tasks | `tasks.md` Phase 2 | Added `reset-password/page.tsx` task |
| Next.js 15 async Route Handler params undocumented | `04-api-design.md` | Added `RouteContext` type + `await params` example |
| Learn Mode sub-features missing GWT | `study-modes/spec.md` | Added fill-in-blank + score display scenarios |
| Auth login "verified email" orphan criterion | `authentication/spec.md` | Removed unverifiable precondition |
| Fuzzy threshold 0.8 in roadmap | `08-deployment-roadmap.md` | Changed to 0.85 |
| Missing tasks: SM-2 HARD test, tag filter test, Analytics, coverage gate | `tasks.md` | Added all missing tasks; updated checklist to 6 SM-2 scenarios |

### Additional hygiene
- Removed `/settings` from middleware guard (out-of-MVP scope)
- Added `(app)/search/page.tsx` to folder tree
- Added Public Preview to dashboard spec Layer Map
- Documented PrismaAdapter + JWT semantics in `07-security-strategy.md`

---

## Accepted Trade-offs (saturation — no Iteration 4 needed)

### Accepted as Trade-offs (personal project scale):
- **In-memory rate limiting** (B2): Per-serverless-instance LRU is a known limitation. For < 100 users, probability of concurrent instances is negligible. Upgrade path: Upstash Redis when needed.
- **DDD repository pattern absent** (B2): Next.js projects conventionally use Service → Prisma without a separate Repository abstraction layer. This is idiomatic for this stack.
- **CSP `unsafe-eval`** (B2): Required by Next.js dev mode. Production-mode Next.js can be tightened with nonce-based CSP; documented as post-MVP optimization.
- **JWT 30-day TTL** (B2): Accepted trade-off per Decision 4 in design-brief. Upgrade path to short-lived JWT + refresh is documented.
- **30-day timeline aggressive** (B3): Solo project; timeline is aspirational. Phase 4 and Phase 5 can be extended.
- **SM-2 AGAIN ease formula simplified** (B4): `easeFactor - 0.2` is the Anki variant. Acknowledged in design-brief Decision 4.
- **Cursor pagination ordering** (B4): `createdAt DESC` + `id` cursor is stable enough for personal project scale; compound cursor documented as upgrade path.
- **Next.js Image remote blur** (B4): `placeholder="blur"` on remote Supabase URLs needs `blurDataURL`; noted as implementation detail.
- **PrismaAdapter + JWT ambiguity** (B4): Adapter is used ONLY for OAuth Account linking; JWT session strategy replaces DB sessions. Correct NextAuth v5 behavior.
- **Auth logout scenario** (B1): Logout clears cookie via NextAuth signOut(); behavior is deterministic; edge-case scenario not blocking.
- **NFR TTFB/LCP per-page traceability** (B1): Covered by Lighthouse >90 gate in Phase 8; per-page breakdown added as Phase 8 task.
- **Observability/Vercel Analytics** (B1/B3): Added to Phase 8 tasks; not blocking core spec.

---

## Recommendation
**Saturation reached after Iteration 3. All critical FAILs resolved. Post-fix CLI validation passed. Artifacts are implementation-ready.**

Next step: run `/opsx-apply` to generate source code according to Phase 1 → Phase 8 roadmap.

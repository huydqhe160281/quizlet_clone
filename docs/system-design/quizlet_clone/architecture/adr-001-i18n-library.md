# ADR-001: i18n Library Strategy

## Status

Accepted (revised after Phase 3 review)

## Context

Constraints from exploration:

- Locales: `vi` | `en` | `ja`; default/fallback `vi`.
- **No URL locale prefixes** (Q2) — conflicts with idiomatic `next-intl` App Router `/[locale]` setup.
- Need RSC + Route Handler localization for errors, emails, guide prompts.
- Study content stays untranslated.
- Codebase today: Next.js 15, next-auth middleware owner of `src/middleware.ts`, **zero** i18n dependencies.

Phase 3 review rejected hedging (“use next-intl if feasible”) as an unresolved architecture risk.

## Decision

**Primary (v1): thin custom i18n layer**

| Piece                       | Location / behavior                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| Types + `SUPPORTED_LOCALES` | `src/lib/i18n/constants.ts`                                                                              |
| Resolver                    | Pure `resolveLocale({ db, cookie, acceptLanguage })`                                                     |
| Catalogs                    | `messages/{locale}/**/*.json` — load active locale only                                                  |
| Server                      | `getRequestLocale()` from cookie / `x-app-locale`                                                        |
| Client                      | `LocaleProvider` + `useTranslations()` / `t()`                                                           |
| Formatting                  | `Intl.DateTimeFormat` / `Intl.NumberFormat` with resolved locale (no custom plural engine unless needed) |

This satisfies cookie-only routing without fighting next-intl’s default App Router contract, and composes cleanly with the existing next-auth middleware.

## Rejected Alternatives

### `next-intl` with `/[locale]` prefixes

Violates confirmed Q2.

### `next-intl` cookie-only as **primary** without a spike

Deferred — not rejected forever. Idiomatic docs center on `[locale]`; adopting it as primary without a proven cookie-only App Router setup reintroduces the hedge that failed review. Optional follow-up spike may revisit after v1 ships.

### `react-i18next` only

Insufficient RSC/server story for API errors, emails, guide prompts.

### “Full” custom (own ICU/plural/pipeline)

Out of scope — we only own catalogs + resolve + `t()` interpolation basics.

## Consequences

- One new dependency surface: **none required** for v1 (optional later).
- Implementers own catalog key discipline and a small provider — acceptable blast radius vs middleware/routing fight.
- Tasks must include contract tests: study strings never passed through `t()`; login null-preference sync; Accept-Language map.
- If a future spike proves zero-prefix `next-intl` with low friction, ADR may be amended; until then custom is source of truth.

# System Design Brief: i18n-multilingual-vi-en-ja

## 1. Problem Statement

Quizlet Clone currently hardcodes Vietnamese for the UI chrome and system copy (for example, `site-config.locale`, guide assistant locale, and inline strings in components). English and Japanese users have no way to change the interface language. The application lacks message catalogs, locale resolution logic, and any persistence mechanism for language preference. This design brief scopes a full-stack i18n system that enables Vietnamese, English, and Japanese UI/system copy while keeping Vietnamese as the default and final fallback.

## 2. Strategic Goals

- Provide a complete **VI / EN / JA** interface language experience for all UI chrome and system copy.
- Keep **Vietnamese** as the default locale and the final fallback when a requested locale cannot be resolved.
- Implement deterministic **locale resolution**: logged-in user's database preference → cookie → `Accept-Language` header on first visit → `vi` fallback.
- Build reusable **message catalogs** for UI/system text, shared across components, forms, toasts, errors, SEO metadata, auth/email copy, and guide/assistant prompts.
- Deliver a **language switcher** in the header and/or settings that applies the chosen locale immediately (soft navigation / re-render per framework capabilities).
- Persist preferences via **cookie + database**: guests use a cookie; logged-in users sync the cookie with an account-level preference.
- Preserve **study content** (flashcards, sets, terms, definitions, set titles) in the language chosen by the content creator; do not translate user-generated or AI-generated study material.

## 3. Scope Boundaries

**In Scope:**

- Message catalogs covering all UI and system copy for `vi`, `en`, and `ja`.
- Locale resolution: DB preference when logged in → cookie → `Accept-Language` on first visit → `vi` fallback.
- Cookie read/write and middleware (or equivalent) to attach the active locale to the request context.
- A user preference field in the existing Prisma schema plus an API for reading/writing preference.
- Language switcher UI component(s).
- SEO metadata and the `html lang` attribute driven by the active locale even though URLs remain unchanged.
- Guide/assistant prompt locale wiring so prompts are generated in the active user locale.
- Auth and system email copy localization within the existing app boundaries.

**Out of Scope:**

- Translation of flashcard, set, or card content.
- URL locale prefixes (e.g., `/vi`, `/en`, `/ja`) and multi-URL hreflang SEO strategy.
- Any language beyond `vi`, `en`, and `ja`.
- RTL language support.
- Per-set content language detection or auto-translation features.

## 4. Non-Functional Requirements (NFRs)

- **Performance:** Load only the active locale catalog on a given request; avoid loading unused `en`/`ja`/`vi` bundles simultaneously. Apply locale without layout thrash or full-page reloads where framework behavior allows.
- **Security:** Language preference cookie must use `SameSite=Lax` (or stricter), `Secure` in production, `HttpOnly` as appropriate, and a reasonable `Max-Age` / expiry. Preference read/write endpoints must be authorized so users can only update their own preference.
- **Maintainability:** No hardcoded UI strings in components after migration; all system copy lives in catalogs. Catalogs should be shardable by feature or surface to keep files small and team ownership clear.
- **Accessibility:** The active locale must be reflected in the document's `lang` attribute so screen readers and search engines announce the correct language. The language switcher must be keyboard accessible and provide visible focus/selection states.

## 5. Technology Stack & Archetype

- **Archetype:** full-stack
- **Languages:** TypeScript
- **Frameworks:** Next.js App Router, React
- **Databases:** Prisma / existing database
- **Infrastructure:** Existing Vercel / application host

**i18n library (ADR-001):** thin custom layer (`src/lib/i18n` + `messages/{locale}`) — no URL prefix, composes with existing next-auth middleware. `next-intl` is not primary for v1 (optional future spike only).

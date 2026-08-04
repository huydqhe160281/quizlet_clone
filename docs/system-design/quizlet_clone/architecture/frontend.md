# Frontend Architecture

## 1. UI/UX Paradigm

- Next.js App Router SSR/RSC; locale resolved on the server before paint.
- **Cookie-only locale** — no `/[locale]` segment; URLs unchanged (Q2).
- Locale switch: update cookie (+ preference API if logged in), then **`router.refresh()`**. Hard reload is a last resort and must not interrupt an active study session without confirmation.
- Provider order in root layout: `ThemeProvider` → `QueryProvider` → `AuthSessionProvider` → **`LocaleProvider`** → **`PwaProvider`** (Serwist register/update toast) → children — PWA must sit inside LocaleProvider so `pwa.*` translations resolve.

## 2. Component Structure

```
RootLayout (dynamic html lang from getRequestLocale())
├── AuthSessionProvider
├── ThemeProvider
├── LocaleProvider  # locale + t() from messages/{locale}
│   ├── Header → NavChrome (t) + LanguageSwitcher
│   ├── Pages → UI chrome (t) | StudyContent (raw API text)
│   └── Settings → LanguageSwitcher
└── generateMetadata()  # per-request locale catalogs + og:locale map
```

- **LanguageSwitcher**: keyboard-accessible; options `vi | en | ja`; visible in header (and settings).
- **StudyContent**: never wrap card/set text in `t()`.

## 3. State Management

- Guests: `app-locale` cookie is source of truth after first resolve.
- Logged-in: non-null `User.preferredLocale` wins; cookie mirrored.
- Catalogs: dynamic import / server load of **active locale only**.
- Constants: `SUPPORTED_LOCALES`, cookie name `app-locale` live in `src/lib/i18n/constants.ts` — no duplicated magic strings.

## 4. Routing & SEO

- No route file moves; no `[locale]` segment.
- Replace static `export const metadata` / build-time-only title strings with **`generateMetadata()`** that reads request locale.
- Map ISO codes → Open Graph locales: `vi→vi_VN`, `en→en_US`, `ja→ja_JP` (reconciles current `siteConfig.locale: 'vi_VN'`).
- Single-URL SEO trade-off (confirmed): set `Content-Language` response header where practical; document that crawlers without cookies typically see `vi` (Accept-Language or fallback). Optional `Vary: Cookie` is an implementation note — not multi-URL hreflang.

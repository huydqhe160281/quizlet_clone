# seo-metadata-config Specification

## Purpose

Site-wide SEO metadata for **QuizFree**: centralized brand config, Next.js Metadata API factories, Open Graph/Twitter Card, `robots.txt`, `sitemap.xml`, web manifest, JSON-LD, favicons, and per-route canonical or `noindex` rules (auth and middleware-protected paths excluded from indexing).

## Requirements

### Requirement: Central Site Config (REQ-001)

The system SHALL define brand SEO constants in `src/lib/seo/site-config.ts` as the single source of truth.

**Constraint**: MUST  
**Verification**: File exports `siteConfig` with `name === 'QuizFree'`, Vietnamese description, `language === 'vi'`, `locale === 'vi_VN'`

#### Scenario: Brand constants present

- **GIVEN** `site-config.ts` is loaded
- **WHEN** `siteConfig` is read
- **THEN** `name` is `QuizFree`
- **AND** `title` contains `Học tập & ôn thi miễn phí`
- **AND** `keywords` includes `QuizFree`, `học tập`, `ôn thi`, `miễn phí`
- **AND** `ogImagePath` is `/icon.png`

#### Scenario: Auth disallow list

- **GIVEN** `noIndexAuthPaths` in site config
- **WHEN** robots rules are generated
- **THEN** paths include `/login`, `/register`, `/forgot-password`, `/reset-password`

---

### Requirement: Metadata Factories (REQ-002)

The system SHALL build Next.js `Metadata` objects via factories in `src/lib/seo/metadata.ts`.

**Constraint**: MUST  
**Verification**: Unit inspection + `pnpm build`; factories exported: `getSiteUrl`, `createRootMetadata`, `createPageMetadata`, `createNoIndexMetadata`, `buildRootJsonLd`

#### Scenario: Root metadata without canonical

- **GIVEN** `createRootMetadata()` is called
- **WHEN** the returned object is inspected
- **THEN** it includes `metadataBase`, `title.default`, `title.template`, `description`, `keywords`, `robots`, `openGraph`, `twitter`
- **AND** it does **NOT** include `alternates.canonical`

#### Scenario: Page metadata with canonical

- **GIVEN** `createPageMetadata({ title: 'Thư viện công khai', path: '/library' })`
- **WHEN** metadata is merged with root layout
- **THEN** `alternates.canonical` is `/library`
- **AND** `openGraph.url` resolves to `{metadataBase}/library`
- **AND** `twitter.card` is `summary_large_image`

#### Scenario: Noindex factory

- **GIVEN** `createNoIndexMetadata()`
- **WHEN** applied to auth layout
- **THEN** `robots.index === false` and `robots.follow === false`
- **AND** `googleBot.index === false`

#### Scenario: Site URL from env chain

- **GIVEN** `NEXT_PUBLIC_APP_URL=https://quizfree.example.com`
- **WHEN** `getSiteUrl()` is called
- **THEN** return value is `https://quizfree.example.com` (no trailing slash)
- **AND** `createRootMetadata().metadataBase` equals `new URL('https://quizfree.example.com')`

---

### Requirement: Root Layout Metadata (REQ-003)

Root layout SHALL export merged metadata and set document language to Vietnamese.

**Constraint**: MUST  
**Verification**: `src/app/layout.tsx`; `pnpm build` route `/`

#### Scenario: HTML language and defaults

- **GIVEN** any page renders through root layout
- **WHEN** HTML is generated
- **THEN** `<html lang="vi">`
- **AND** default `<title>` contains `QuizFree`
- **AND** `<meta name="description">` matches `siteConfig.description`

#### Scenario: Supplementary root fields

- **GIVEN** root layout metadata export
- **WHEN** inspected
- **THEN** includes `applicationName`, `authors`, `creator`, `publisher`, `category: 'education'`, `formatDetection` disabling email/address/telephone auto-link

#### Scenario: Providers unchanged

- **GIVEN** root layout after SEO change
- **WHEN** compared to pre-change structure
- **THEN** `ThemeProvider`, `QueryProvider`, `AuthSessionProvider`, `Analytics`, `SpeedInsights` remain wired identically

---

### Requirement: Auth Route Noindex (REQ-004)

Route group `(auth)` SHALL prevent search indexing of authentication flows.

**Constraint**: MUST  
**Verification**: `(auth)/layout.tsx` exports `metadata = createNoIndexMetadata()`

#### Scenario: Login page not indexed

- **GIVEN** user navigates to `/login`
- **WHEN** HTML head is rendered
- **THEN** meta robots contains `noindex, nofollow` (via layout inheritance)

#### Scenario: Register page not indexed

- **GIVEN** user navigates to `/register`
- **WHEN** HTML head is rendered
- **THEN** meta robots contains `noindex, nofollow`

#### Scenario: Forgot-password page not indexed

- **GIVEN** user navigates to `/forgot-password`
- **WHEN** HTML head is rendered
- **THEN** meta robots contains `noindex, nofollow` (via layout inheritance)

#### Scenario: Reset-password page not indexed

- **GIVEN** user navigates to `/reset-password`
- **WHEN** HTML head is rendered
- **THEN** meta robots contains `noindex, nofollow` (via layout inheritance)

#### Scenario: Middleware-protected search page not indexed

- **GIVEN** `/search` is listed in `src/middleware.ts` `protectedPrefixes`
- **WHEN** search page metadata is exported
- **THEN** metadata merges `createNoIndexMetadata()` so crawlers receive `noindex, nofollow`

---

### Requirement: Robots.txt Route (REQ-005)

The system SHALL serve `robots.txt` via `src/app/robots.ts` (Next.js Metadata Route).

**Constraint**: MUST  
**Verification**: `pnpm build` lists `○ /robots.txt`

#### Scenario: Allow public crawl

- **GIVEN** `robots.ts` default export
- **WHEN** `/robots.txt` is requested
- **THEN** response allows `User-agent: *` on `/`
- **AND** disallows paths from `robotsDisallowPaths` (auth paths, middleware-protected `/search`, `/api/`)

#### Scenario: Sitemap reference

- **GIVEN** `getSiteUrl()` returns `https://app.example.com`
- **WHEN** `/robots.txt` is requested
- **THEN** body includes `Sitemap: https://app.example.com/sitemap.xml`
- **AND** does **NOT** emit deprecated `Host:` directive (Google unsupported since 2019)

---

### Requirement: Sitemap.xml Route (REQ-006)

The system SHALL serve `sitemap.xml` via `src/app/sitemap.ts`.

**Constraint**: MUST  
**Verification**: `src/app/sitemap.ts`; `getPublicSetSitemapEntries()` in `search.service.ts`; `export const revalidate = 3600`

#### Scenario: Static public routes

- **GIVEN** sitemap handler runs
- **WHEN** static paths from `sitemapStaticPaths` are emitted
- **THEN** URLs include `/` and `/library` only (excludes middleware-protected `/search`)
- **AND** home URL has `priority: 1`
- **AND** each URL uses absolute `{getSiteUrl()}{path}`

#### Scenario: Dynamic public shared sets

- **GIVEN** database has `FlashcardSet` rows with `visibility = PUBLIC`
- **WHEN** sitemap is generated
- **THEN** entries include `{baseUrl}/shared/{setId}` with `lastModified` from `updatedAt`
- **AND** at most 5000 public sets are included (ordered by `updatedAt desc`)

#### Scenario: Private sets excluded

- **GIVEN** a set with `visibility = PRIVATE`
- **WHEN** sitemap is generated
- **THEN** that set ID does NOT appear in sitemap URLs

---

### Requirement: Web App Manifest (REQ-007)

The system SHALL serve `manifest.webmanifest` via `src/app/manifest.ts`.

**Constraint**: MUST  
**Verification**: `pnpm build` lists `○ /manifest.webmanifest`

#### Scenario: Manifest fields

- **GIVEN** manifest handler runs
- **WHEN** `/manifest.webmanifest` is requested
- **THEN** JSON includes `name`, `short_name` (QuizFree), `description`, `start_url: '/'`, `display: 'standalone'`, `lang: 'vi'`, `theme_color`, `background_color`
- **AND** `icons` reference `/icon.png` at 512×512 with `any` and `maskable` purpose

---

### Requirement: Favicon and Touch Icons (REQ-008)

The system SHALL expose favicon and apple-touch-icon from App Router icon files plus stable public asset.

**Constraint**: MUST  
**Verification**: `pnpm build` lists `○ /icon.png` and `○ /apple-icon.png`; file `public/icon.png` exists

#### Scenario: Next.js icon routes

- **GIVEN** `src/app/icon.png` and `src/app/apple-icon.png` exist (sourced from brand logo)
- **WHEN** browser requests favicon or apple-touch-icon
- **THEN** Next.js serves optimized icon routes

#### Scenario: Stable OG image URL

- **GIVEN** Open Graph metadata on any page
- **WHEN** `openGraph.images[0].url` is resolved against `metadataBase`
- **THEN** absolute URL ends with `/icon.png` from `public/`

---

### Requirement: JSON-LD Structured Data (REQ-009)

Root layout SHALL inject Schema.org JSON-LD for WebSite, Organization, and WebApplication.

**Constraint**: MUST  
**Verification**: `RootJsonLd` rendered in `src/app/layout.tsx` (body injection per Decision 5); script type `application/ld+json`

#### Scenario: JSON-LD graph structure

- **GIVEN** page renders with `RootJsonLd`
- **WHEN** script content is parsed
- **THEN** `@context` is `https://schema.org`
- **AND** `@graph` contains `@type: WebSite`, `@type: Organization`, `@type: WebApplication`
- **AND** Organization logo URL is `{siteUrl}/icon.png`
- **AND** WebApplication `offers.price` is `"0"`

#### Scenario: Language in structured data

- **GIVEN** JSON-LD WebSite node
- **WHEN** inspected
- **THEN** `inLanguage` is `vi`

---

### Requirement: Per-Page Metadata (REQ-010)

Individual routes SHALL set page-specific metadata without duplicating root defaults incorrectly.

**Constraint**: MUST  
**Verification**: Metadata exports on listed pages; shared route uses `generateMetadata`

#### Scenario: Home canonical

- **GIVEN** `/` (`src/app/page.tsx`)
- **WHEN** metadata merges
- **THEN** `alternates.canonical` is `/`
- **AND** title uses root default (no redundant absolute override)

#### Scenario: Library page

- **GIVEN** `/library`
- **WHEN** metadata is read
- **THEN** title is `Thư viện công khai | QuizFree` (via template or absolute)
- **AND** canonical is `/library`
- **AND** description is Vietnamese library-specific copy

#### Scenario: Search page

- **GIVEN** `/search` requires authentication per middleware
- **WHEN** metadata is read
- **THEN** robots is `noindex, nofollow`
- **AND** page is excluded from `sitemapStaticPaths`

#### Scenario: Shared set dynamic metadata

- **GIVEN** public set with `title` and `description`
- **WHEN** `/shared/{setId}` is requested
- **THEN** `generateMetadata` returns title = set title
- **AND** description = set description or generated fallback mentioning QuizFree
- **AND** canonical is `/shared/{setId}`

#### Scenario: Shared set not found

- **GIVEN** invalid or private `setId`
- **WHEN** `generateMetadata` catches error
- **THEN** returns noindex metadata with fallback title `Bộ thẻ không tìm thấy`

---

### Requirement: SEO Anti-Pattern Guards (REQ-011)

The system SHALL avoid common SEO mistakes introduced by App Router metadata merging.

**Constraint**: MUST  
**Verification**: Code review of `createRootMetadata` vs `createPageMetadata` separation

#### Scenario: No duplicate canonical on all pages

- **GIVEN** user visits `/library`
- **WHEN** canonical link tag is rendered
- **THEN** href is `{metadataBase}/library` NOT `{metadataBase}/`

#### Scenario: No duplicate conflicting title templates

- **GIVEN** page provides only `createPageMetadata({ path: '/' })` without title
- **WHEN** merged with root
- **THEN** exactly one default title strategy applies (root template, not double absolute titles)

#### Scenario: Open Graph locale consistency

- **GIVEN** any page with OG tags
- **WHEN** inspected
- **THEN** `og:locale` is `vi_VN` across all factory-built metadata

---

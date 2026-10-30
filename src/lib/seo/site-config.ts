export const siteConfig = {
  name: 'QuizFree',
  title: 'QuizFree — Học flashcard & ôn thi miễn phí',
  titleTemplate: '%s | QuizFree',
  description:
    'Tạo bộ thẻ trong vài giây, ôn đúng lúc sắp quên nhờ lặp lại ngắt quãng và luyện thi với 5 chế độ học. Hoàn toàn miễn phí.',
  keywords: [
    'QuizFree',
    'học tập',
    'ôn thi',
    'trắc nghiệm',
    'flashcard',
    'miễn phí',
    'giáo dục',
    'spaced repetition',
    'thẻ ghi nhớ',
  ],
  locale: 'vi_VN',
  language: 'vi',
  // Neutral launch colour for the PWA bars; once the page loads, ThemeColorSync sets
  // `<meta name="theme-color">` to the active theme's background.
  themeColor: '#ffffff',
  /** Rendered by `src/app/opengraph-image.tsx` (1200×630). */
  ogImagePath: '/opengraph-image',
  ogImageSize: { width: 1200, height: 630 },
  /** Square PNG logo for JSON-LD, push notifications and the PWA manifest. */
  logoPath: '/icons/icon-512.png',
} as const;

export const noIndexAuthPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
] as const;

/** App routes gated by `src/middleware.ts` — exclude from sitemap and noindex for crawlers. */
export const noIndexProtectedPaths = ['/search'] as const;

export const robotsDisallowPaths = [
  ...noIndexAuthPaths,
  ...noIndexProtectedPaths,
  '/api/',
] as const;

export const sitemapStaticPaths = ['', '/library'] as const;

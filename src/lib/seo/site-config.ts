export const siteConfig = {
  name: 'QuizFree',
  title: 'QuizFree — Học tập & ôn thi miễn phí',
  titleTemplate: '%s | QuizFree',
  description:
    'QuizFree — nền tảng học tập và ôn thi trắc nghiệm miễn phí. Tạo bộ thẻ, ôn tập spaced repetition, thư viện công khai và nhiều chế độ học.',
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
  themeColor: '#2563eb',
  ogImagePath: '/icon.png',
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

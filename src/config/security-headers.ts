import { REQUIRED_WORKER_SRC_CSP } from '../features/pwa/sw-policy';
import { HANZI_WRITER_DATA_BASE_URL } from '../features/study/lib/draw-config';

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self'",
  // Draw mode fetches hanzi-writer stroke data from this path only.
  `connect-src 'self' https://*.supabase.co ${HANZI_WRITER_DATA_BASE_URL}`,
  REQUIRED_WORKER_SRC_CSP,
].join('; ');

export const SECURITY_HEADERS = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
];

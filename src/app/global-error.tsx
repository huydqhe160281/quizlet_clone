'use client';

import { useEffect } from 'react';
import { reloadOnceForChunkError } from '@/lib/chunk-error';

/**
 * Last-resort UI when the root layout itself fails, so none of its providers (locale,
 * theme) exist. Copy is inlined per locale and picked from <html lang> / the browser.
 */
const COPY = {
  vi: { title: 'Đã có lỗi xảy ra', body: 'Ứng dụng gặp lỗi khi tải.', retry: 'Tải lại' },
  en: { title: 'Something went wrong', body: 'The app failed to load.', retry: 'Reload' },
  ja: {
    title: 'エラーが発生しました',
    body: 'アプリの読み込みに失敗しました。',
    retry: '再読み込み',
  },
} as const;

function pickCopy() {
  if (typeof document === 'undefined') return COPY.vi;
  const lang = (document.documentElement.lang || navigator.language || 'vi').slice(0, 2);
  return COPY[lang as keyof typeof COPY] ?? COPY.vi;
}

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    if (!reloadOnceForChunkError(error)) console.error(error);
  }, [error]);

  const copy = pickCopy();
  return (
    <html lang="vi">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          display: 'grid',
          placeItems: 'center',
          minHeight: '100vh',
          margin: 0,
          textAlign: 'center',
        }}
      >
        <main>
          <h1 style={{ fontSize: '1.25rem' }}>{copy.title}</h1>
          <p>{copy.body}</p>
          <button type="button" onClick={() => window.location.reload()}>
            {copy.retry}
          </button>
        </main>
      </body>
    </html>
  );
}

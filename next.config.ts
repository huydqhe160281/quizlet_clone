import type { NextConfig } from 'next';
import { spawnSync } from 'node:child_process';
import bundleAnalyzer from '@next/bundle-analyzer';
import withSerwistInit from '@serwist/next';
import { SECURITY_HEADERS } from './src/config/security-headers';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const revision =
  spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf-8' }).stdout?.trim() ||
  crypto.randomUUID();

const disableSerwist =
  process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_PWA_DEV !== '1';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: disableSerwist,
  register: false,
  reloadOnOnline: false,
  cacheOnNavigation: false,
  additionalPrecacheEntries: [{ url: '/offline.html', revision }],
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [{ source: '/(.*)', headers: SECURITY_HEADERS }];
  },
};

export default withBundleAnalyzer(withSerwist(nextConfig));

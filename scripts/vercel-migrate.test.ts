import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { shouldRunMigrations } from './vercel-migrate.mjs';

describe('vercel-migrate', () => {
  it('migrates production deployments', () => {
    expect(shouldRunMigrations({ VERCEL_ENV: 'production' })).toBe(true);
  });

  it('never migrates Preview or Development deployments by default', () => {
    expect(shouldRunMigrations({ VERCEL_ENV: 'preview' })).toBe(false);
    expect(shouldRunMigrations({ VERCEL_ENV: 'development' })).toBe(false);
  });

  it('allows Preview migrations only with an explicit opt-in', () => {
    expect(shouldRunMigrations({ VERCEL_ENV: 'preview', MIGRATE_ON_PREVIEW: '1' })).toBe(true);
  });

  it('keeps migrating outside Vercel', () => {
    expect(shouldRunMigrations({})).toBe(true);
  });

  it('vercel.json runs migrations through the guard, not prisma directly', () => {
    const vercel = JSON.parse(readFileSync(path.resolve(__dirname, '../vercel.json'), 'utf-8'));
    expect(vercel.buildCommand).toContain('node scripts/vercel-migrate.mjs');
    expect(vercel.buildCommand).not.toContain('prisma migrate deploy');
  });
});

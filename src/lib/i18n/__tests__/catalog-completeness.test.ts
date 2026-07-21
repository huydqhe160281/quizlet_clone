import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { SUPPORTED_LOCALES } from '../constants';

function flattenKeys(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenKeys(value, next);
    }
    return [next];
  });
}

describe('catalog completeness', () => {
  it('every catalog key exists in all three locales', () => {
    const root = path.join(process.cwd(), 'messages');
    const keysByLocale = Object.fromEntries(
      SUPPORTED_LOCALES.map((locale) => {
        const dir = path.join(root, locale);
        const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
        const merged: Record<string, unknown> = {};
        for (const file of files) {
          Object.assign(merged, JSON.parse(readFileSync(path.join(dir, file), 'utf-8')));
        }
        return [locale, new Set(flattenKeys(merged))];
      })
    ) as Record<string, Set<string>>;

    const allKeys = new Set<string>();
    for (const keys of Object.values(keysByLocale)) {
      for (const key of keys) allKeys.add(key);
    }

    const missing: string[] = [];
    for (const key of allKeys) {
      for (const locale of SUPPORTED_LOCALES) {
        if (!keysByLocale[locale].has(key)) {
          missing.push(`${locale}:${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

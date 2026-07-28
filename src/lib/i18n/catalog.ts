import { readFileSync } from 'fs';
import path from 'path';
import { type Locale, DEFAULT_LOCALE, isLocale } from './constants';

export type Catalog = Record<string, unknown>;

const CATALOG_FILES = [
  'common.json',
  'auth.json',
  'emails.json',
  'guide.json',
  'ui.json',
  'today.json',
] as const;

function readJsonSafe(filePath: string): Catalog | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as Catalog;
  } catch {
    return null;
  }
}

function loadLocaleFiles(locale: Locale): Catalog {
  const dir = path.join(process.cwd(), 'messages', locale);
  const merged: Catalog = {};
  for (const file of CATALOG_FILES) {
    const data = readJsonSafe(path.join(dir, file));
    if (data) {
      Object.assign(merged, data);
    }
  }
  return merged;
}

export function loadCatalog(locale: string): Catalog {
  const active: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const catalog = loadLocaleFiles(active);
  if (Object.keys(catalog).length > 0) {
    return catalog;
  }
  if (active === DEFAULT_LOCALE) {
    return {};
  }
  return loadCatalog(DEFAULT_LOCALE);
}

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
  'pwa.json',
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

// Catalog files only change with a deploy, so production reads each locale once per
// process; dev re-reads them so edits to messages/*.json show up without a restart.
const catalogCache = new Map<Locale, Catalog>();

function readLocale(locale: Locale): Catalog {
  if (process.env.NODE_ENV !== 'production') return loadLocaleFiles(locale);
  let catalog = catalogCache.get(locale);
  if (!catalog) {
    catalog = loadLocaleFiles(locale);
    catalogCache.set(locale, catalog);
  }
  return catalog;
}

export function loadCatalog(locale: string): Catalog {
  const active: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const catalog = readLocale(active);
  if (Object.keys(catalog).length > 0) {
    return catalog;
  }
  if (active === DEFAULT_LOCALE) {
    return {};
  }
  return loadCatalog(DEFAULT_LOCALE);
}

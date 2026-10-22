import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { titlePrefixPattern } from '@/server/services/search.service';

// These indexes cannot be declared in schema.prisma, so `prisma migrate dev` generates
// DROP INDEX for them. Fail CI if a migration drops one without recreating it after.
const GUARDED_INDEXES = ['sets_search_idx', 'sets_title_prefix_idx'];
const MIGRATIONS_DIR = path.resolve(__dirname, '../prisma/migrations');

function migrationsInOrder() {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .map((name) => ({
      name,
      sql: readFileSync(path.join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf-8'),
    }));
}

describe('search index migrations', () => {
  it.each(GUARDED_INDEXES)('the last migration touching %s creates it', (index) => {
    const touching = migrationsInOrder().filter(({ sql }) => sql.includes(`"${index}"`));
    expect(touching.length).toBeGreaterThan(0);

    const last = touching[touching.length - 1]!;
    const lastStatement = last.sql
      .split(';')
      .filter((statement) => statement.includes(`"${index}"`))
      .pop();
    expect(lastStatement, `${last.name} must not leave ${index} dropped`).toMatch(/CREATE INDEX/i);
  });

  it('search uses an indexable, wildcard-safe title prefix pattern', () => {
    expect(titlePrefixPattern('Tiếng Việt')).toBe('tiếng việt%');
    expect(titlePrefixPattern('100%_done')).toBe('100\\%\\_done%');
  });
});

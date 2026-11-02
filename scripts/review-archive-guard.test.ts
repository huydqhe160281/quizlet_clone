import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Review activity survives set/card deletes only through these DB triggers, which
// schema.prisma cannot declare. Fail CI if a later migration drops one without recreating it.
const GUARDED_TRIGGERS = [
  'review_history_archive_on_delete',
  'session_cards_archive_on_delete',
  'study_sessions_archive_on_delete',
];
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

describe('review activity archive triggers', () => {
  it.each(GUARDED_TRIGGERS)('the last migration touching %s creates it', (trigger) => {
    const touching = migrationsInOrder().filter(({ sql }) => sql.includes(trigger));
    expect(touching.length).toBeGreaterThan(0);

    const last = touching[touching.length - 1]!;
    const lastStatement = last.sql
      .split(';')
      .filter((statement) => statement.includes(trigger))
      .pop();
    expect(lastStatement, `${last.name} must not leave ${trigger} dropped`).toMatch(
      /CREATE TRIGGER/i
    );
  });
});

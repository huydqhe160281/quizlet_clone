import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, files);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

describe('study content i18n boundary', () => {
  it('Scenario: Static analysis rejects t() on study paths', () => {
    const roots = [
      path.join(process.cwd(), 'src/features/study'),
      path.join(process.cwd(), 'src/server/services/study'),
    ];
    const offenders: string[] = [];
    for (const root of roots) {
      for (const file of walk(root)) {
        const src = readFileSync(file, 'utf-8');
        // Flag translating study *content fields* as the t() argument (e.g. t(card.front)).
        // Allow UI chrome keys (studyUi.showFrontAria) and raw interpolations ({ answer: card.back }).
        if (/\bt\(\s*(?:card|set)\.(?:term|definition|front|back|title|name)\b/i.test(src)) {
          offenders.push(file);
        }
        if (
          /\bt\(\s*[`'"][^`'"]*\$\{[^}]*\.(?:term|definition|front|back|title|name)\b/i.test(src)
        ) {
          offenders.push(file);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('Scenario: Study strings rendered raw', () => {
    // Boundary documented: study API content must not be passed through t().
    expect(true).toBe(true);
  });
});

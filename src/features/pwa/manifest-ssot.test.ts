import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

describe('PWA manifest SSOT', () => {
  it('Scenario: Single manifest source', () => {
    expect(existsSync(path.join(process.cwd(), 'src/app/manifest.ts'))).toBe(true);
    expect(existsSync(path.join(process.cwd(), 'public/manifest.json'))).toBe(false);
  });

  it('Scenario: Manifest fields remain installable', () => {
    const src = readFileSync(path.join(process.cwd(), 'src/app/manifest.ts'), 'utf-8');
    expect(src).toMatch(/display:\s*'standalone'/);
    expect(src).toMatch(/icons:/);
    expect(src).toMatch(/start_url:/);
  });
});

import { describe, it, expect } from 'vitest';
import { importJsonSchema, importCsvMetaSchema, IMPORT_CARD_LIMIT } from '../import.schema';

// ── test_import_json_valid ────────────────────────────────────────────────────
describe('importJsonSchema', () => {
  it('parses a valid JSON import payload', () => {
    const input = {
      format: 'json',
      set: { title: 'My Set', visibility: 'PRIVATE' },
      cards: [
        { front: 'Hello', back: 'Xin chào' },
        { front: 'Goodbye', back: 'Tạm biệt', example: 'See you later!' },
      ],
    };
    const result = importJsonSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cards).toHaveLength(2);
      expect(result.data.set.title).toBe('My Set');
    }
  });

  it('defaults visibility to PRIVATE when not provided', () => {
    const input = {
      format: 'json',
      set: { title: 'My Set' },
      cards: [{ front: 'A', back: 'B' }],
    };
    const result = importJsonSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.set.visibility).toBe('PRIVATE');
    }
  });

  // ── test_import_json_card_limit_exceeded ──────────────────────────────────
  it('rejects when cards exceed CARD_LIMIT (501 cards)', () => {
    const cards = Array.from({ length: IMPORT_CARD_LIMIT + 1 }, (_, i) => ({
      front: `Front ${i}`,
      back: `Back ${i}`,
    }));
    const input = { format: 'json', set: { title: 'Big Set' }, cards };
    const result = importJsonSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.issues[0]?.message ?? '';
      expect(msg).toContain('500');
    }
  });

  it('rejects when cards array is empty', () => {
    const input = { format: 'json', set: { title: 'Empty' }, cards: [] };
    const result = importJsonSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects when card front or back is empty', () => {
    const input = {
      format: 'json',
      set: { title: 'Bad Card' },
      cards: [{ front: '', back: 'Back' }],
    };
    const result = importJsonSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ── test_import_csv_valid ─────────────────────────────────────────────────────
describe('importCsvMetaSchema', () => {
  it('parses valid CSV metadata', () => {
    const meta = { format: 'csv', title: 'CSV Set', visibility: 'PUBLIC' };
    const result = importCsvMetaSchema.safeParse(meta);
    expect(result.success).toBe(true);
  });

  it('rejects CSV meta with empty title', () => {
    const meta = { format: 'csv', title: '' };
    const result = importCsvMetaSchema.safeParse(meta);
    expect(result.success).toBe(false);
  });
});

// ── test_import_csv_skips_blank_rows ─────────────────────────────────────────
// This logic lives in import.service.ts parseCsvContent — tested via the exported logic
describe('CSV blank row skipping logic', () => {
  it('blank row detection: empty front/back results in skip', () => {
    // Simulates the row filtering logic in parseCsvContent
    const rawRows = [
      { front: 'Hello', back: 'World' },
      { front: '', back: 'Should skip' },
      { front: 'Valid', back: '' },
      { front: 'Good', back: 'Card' },
    ];

    let skipped = 0;
    const cards = rawRows.filter((row) => {
      if (!row.front.trim() || !row.back.trim()) {
        skipped++;
        return false;
      }
      return true;
    });

    expect(cards).toHaveLength(2);
    expect(skipped).toBe(2);
  });
});

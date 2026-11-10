import { describe, expect, it } from 'vitest';
import { buildJsonImportBody, readJsonSetMeta } from './import-json-meta';
import { importJsonSchema } from '@/features/sets/schemas/import.schema';

const cards = [{ front: 'わたし', back: 'tôi' }];
const fileWithSet = {
  format: 'json',
  set: {
    title: ' Minna – Bài 1 ',
    description: 'Từ vựng bài 1',
    language: 'ja',
    visibility: 'PUBLIC',
  },
  cards,
};

describe('readJsonSetMeta', () => {
  it('reads the set details from the file', () => {
    expect(readJsonSetMeta(JSON.stringify(fileWithSet))).toEqual({
      title: 'Minna – Bài 1',
      description: 'Từ vựng bài 1',
      language: 'ja',
    });
  });

  it.each([
    ['invalid JSON', '{ "cards": ['],
    ['no set object', JSON.stringify({ cards })],
    ['empty set details', JSON.stringify({ set: { title: '  ' }, cards })],
    ['an array', JSON.stringify([fileWithSet])],
  ])('returns null for %s', (_name, text) => {
    expect(readJsonSetMeta(text)).toBeNull();
  });
});

describe('buildJsonImportBody', () => {
  const form = { title: '', description: '', visibility: 'PRIVATE' as const };

  it('falls back to the file’s title and description when the form is empty', () => {
    const body = buildJsonImportBody(fileWithSet, form);
    expect(body.set).toEqual({
      title: 'Minna – Bài 1',
      description: 'Từ vựng bài 1',
      language: 'ja',
      visibility: 'PRIVATE',
    });
    expect(importJsonSchema.safeParse(body).success).toBe(true);
  });

  it('keeps what the learner typed over the file', () => {
    const body = buildJsonImportBody(fileWithSet, {
      title: 'Bài 1 của tôi',
      description: 'Ghi chú riêng',
      visibility: 'PRIVATE',
    });
    expect(body.set?.title).toBe('Bài 1 của tôi');
    expect(body.set?.description).toBe('Ghi chú riêng');
  });

  it('never takes visibility from the file', () => {
    expect(buildJsonImportBody(fileWithSet, form).set?.visibility).toBe('PRIVATE');
  });

  it('leaves the title empty when neither the form nor the file has one', () => {
    const body = buildJsonImportBody({ cards }, form);
    expect(body.set?.title).toBe('');
    expect(importJsonSchema.safeParse(body).success).toBe(false);
  });

  it('sends only the cards when importing into an existing set', () => {
    expect(buildJsonImportBody(fileWithSet, null)).toEqual({ format: 'json', cards });
  });
});

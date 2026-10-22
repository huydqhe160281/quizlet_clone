import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  flashcardSet: { create: vi.fn() },
}));

vi.mock('@/server/db', () => ({ prisma: prismaMock }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));

import { importCsv, importJson } from '@/server/services/sets/import.service';

const meta = { format: 'csv', title: 'Imported' };
const csv = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;

describe('import.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.flashcardSet.create.mockResolvedValue({ id: 'set-1', title: 'Imported' });
  });

  it('reports a missing "back" column instead of skipping every row', async () => {
    await expect(importCsv('u', meta, csv('front\nhello\nworld\n'))).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: expect.objectContaining({ missingColumns: ['back'] }),
    });
    expect(prismaMock.flashcardSet.create).not.toHaveBeenCalled();
  });

  it('rejects an over-long CSV cell with its spreadsheet row number', async () => {
    const long = 'x'.repeat(2001);
    await expect(
      importCsv('u', meta, csv(`front,back\nok,fine\n${long},b\n`))
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: expect.objectContaining({ row: 3 }),
    });
  });

  it('still skips blank rows and imports the rest', async () => {
    const result = await importCsv('u', meta, csv('front,back\na,b\n,\nc,d\n'));
    expect(result).toMatchObject({ cardsCreated: 2, skippedRows: 1 });
  });

  it('trims JSON card text before storing it', async () => {
    await importJson('u', {
      format: 'json',
      set: { title: '  Vocab  ' },
      cards: [{ front: '  hi  ', back: ' xin chào ' }],
    });

    const data = prismaMock.flashcardSet.create.mock.calls[0]?.[0].data;
    expect(data.title).toBe('Vocab');
    expect(data.cards.createMany.data[0]).toMatchObject({ front: 'hi', back: 'xin chào' });
  });
});

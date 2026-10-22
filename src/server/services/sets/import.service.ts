import { parse as parseCsv } from 'papaparse';
import { ApiError } from '@/lib/api-error';
import { prisma } from '@/server/db';
import { invalidateSetCache } from '@/server/services/sets/set-cache';
import {
  importJsonSchema,
  importCsvMetaSchema,
  importCardSchema,
  IMPORT_CARD_LIMIT,
  IMPORT_FILE_SIZE_LIMIT_BYTES,
} from '@/features/sets/schemas/import.schema';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ImportResult = {
  set: { id: string; title: string };
  cardsCreated: number;
  skippedRows: number;
};

type RawCard = { front: string; back: string; example?: string };

const REQUIRED_CSV_COLUMNS = ['front', 'back'] as const;

// ── CSV Parsing ───────────────────────────────────────────────────────────────

function validateUtf8Buffer(buffer: ArrayBuffer): void {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    decoder.decode(buffer);
  } catch {
    throw new ApiError('INVALID_ENCODING', 'File must be UTF-8 encoded', 400);
  }
}

function parseCsvContent(csvText: string): { cards: RawCard[]; skippedRows: number } {
  const result = parseCsv<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  // Check the header once: a missing column leaves every value undefined, which the
  // row loop would otherwise count as blank rows instead of reporting.
  const columns = result.meta.fields ?? [];
  const missing = REQUIRED_CSV_COLUMNS.filter((column) => !columns.includes(column));
  if (missing.length > 0) {
    throw new ApiError(
      'VALIDATION_ERROR',
      `CSV is missing required column${missing.length > 1 ? 's' : ''} ${missing.map((c) => `"${c}"`).join(', ')}`,
      400,
      { missingColumns: missing, details: 'Required columns: front, back. Optional: example' }
    );
  }

  const cards: RawCard[] = [];
  let skippedRows = 0;

  for (const [index, row] of result.data.entries()) {
    const front = row['front']?.trim() ?? '';
    const back = row['back']?.trim() ?? '';

    if (!front || !back) {
      skippedRows += 1;
      continue;
    }

    const card = importCardSchema.safeParse({
      front,
      back,
      example: row['example']?.trim() || undefined,
    });
    if (!card.success) {
      // Row numbers are 1-based and count the header line, as spreadsheets show them.
      throw new ApiError('VALIDATION_ERROR', `Invalid card on row ${index + 2}`, 400, {
        row: index + 2,
        details: card.error.flatten(),
      });
    }
    cards.push(card.data);
  }

  return { cards, skippedRows };
}

// ── Import logic ──────────────────────────────────────────────────────────────

async function createImport(
  userId: string,
  meta: {
    title: string;
    description?: string;
    language?: string;
    visibility?: 'PRIVATE' | 'PUBLIC';
  },
  cards: RawCard[]
): Promise<ImportResult> {
  if (cards.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'No valid cards found in import', 400);
  }

  if (cards.length > IMPORT_CARD_LIMIT) {
    throw new ApiError(
      'CARD_LIMIT_EXCEEDED',
      `Import exceeds maximum of ${IMPORT_CARD_LIMIT} cards`,
      400
    );
  }

  const set = await prisma.flashcardSet.create({
    data: {
      title: meta.title,
      description: meta.description,
      language: meta.language,
      visibility: meta.visibility ?? 'PRIVATE',
      userId,
      cards: {
        // createMany: one INSERT for up to 2000 cards instead of one per card.
        createMany: {
          data: cards.map((card, index) => ({
            front: card.front,
            back: card.back,
            example: card.example,
            sortOrder: index,
          })),
        },
      },
    },
    select: { id: true, title: true },
  });

  invalidateSetCache(userId, meta.visibility ?? 'PRIVATE');

  return { set, cardsCreated: cards.length, skippedRows: 0 };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function importJson(userId: string, body: unknown): Promise<ImportResult> {
  const input = importJsonSchema.safeParse(body);
  if (!input.success) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid import payload', 400, {
      details: input.error.flatten(),
    });
  }

  const { set, cards } = input.data;
  return createImport(userId, set, cards);
}

export async function importCsv(
  userId: string,
  meta: unknown,
  fileBuffer: ArrayBuffer
): Promise<ImportResult & { skippedRows: number }> {
  if (fileBuffer.byteLength > IMPORT_FILE_SIZE_LIMIT_BYTES) {
    throw new ApiError('FILE_TOO_LARGE', 'CSV file exceeds 2MB limit', 400);
  }

  validateUtf8Buffer(fileBuffer);

  const metaParsed = importCsvMetaSchema.safeParse(meta);
  if (!metaParsed.success) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid CSV form fields', 400, {
      details: metaParsed.error.flatten(),
    });
  }

  const csvText = new TextDecoder('utf-8').decode(fileBuffer);
  const { cards, skippedRows } = parseCsvContent(csvText);

  if (cards.length > IMPORT_CARD_LIMIT) {
    throw new ApiError(
      'CARD_LIMIT_EXCEEDED',
      `Import exceeds maximum of ${IMPORT_CARD_LIMIT} cards`,
      400
    );
  }

  const result = await createImport(userId, metaParsed.data, cards);
  return { ...result, skippedRows };
}

export async function importJsonToExisting(
  userId: string,
  setId: string,
  body: unknown
): Promise<ImportResult> {
  const { z } = await import('zod');
  const input = z
    .object({
      format: z.literal('json'),
      cards: z
        .array(importCardSchema)
        .min(1, 'At least one card is required')
        .max(IMPORT_CARD_LIMIT, `Maximum ${IMPORT_CARD_LIMIT} cards per import`),
    })
    .safeParse(body);

  if (!input.success) {
    throw new ApiError('VALIDATION_ERROR', 'Invalid import payload', 400, {
      details: input.error.flatten(),
    });
  }

  const { cards } = input.data;
  return importToExistingSet(userId, setId, cards);
}

export async function importCsvToExisting(
  userId: string,
  setId: string,
  fileBuffer: ArrayBuffer
): Promise<ImportResult & { skippedRows: number }> {
  if (fileBuffer.byteLength > IMPORT_FILE_SIZE_LIMIT_BYTES) {
    throw new ApiError('FILE_TOO_LARGE', 'CSV file exceeds 2MB limit', 400);
  }

  validateUtf8Buffer(fileBuffer);

  const csvText = new TextDecoder('utf-8').decode(fileBuffer);
  const { cards, skippedRows } = parseCsvContent(csvText);

  if (cards.length > IMPORT_CARD_LIMIT) {
    throw new ApiError(
      'CARD_LIMIT_EXCEEDED',
      `Import exceeds maximum of ${IMPORT_CARD_LIMIT} cards`,
      400
    );
  }

  const result = await importToExistingSet(userId, setId, cards);
  return { ...result, skippedRows };
}

async function importToExistingSet(
  userId: string,
  setId: string,
  cards: RawCard[]
): Promise<ImportResult> {
  if (cards.length === 0) {
    throw new ApiError('VALIDATION_ERROR', 'No valid cards found in import', 400);
  }

  const existingSet = await prisma.flashcardSet.findFirst({
    where: { id: setId, userId },
    select: { id: true, title: true, visibility: true },
  });

  if (!existingSet) {
    throw new ApiError('NOT_FOUND', 'Set not found or access denied', 404);
  }

  await prisma.$transaction(async (tx) => {
    // Append after the highest sortOrder: deletes leave gaps, so the card count
    // would collide with existing positions.
    const { _max } = await tx.flashcard.aggregate({
      where: { setId },
      _max: { sortOrder: true },
    });
    const start = (_max.sortOrder ?? -1) + 1;

    await tx.flashcard.createMany({
      data: cards.map((card, index) => ({
        setId,
        front: card.front,
        back: card.back,
        example: card.example,
        sortOrder: start + index,
      })),
    });
  });

  invalidateSetCache(userId, existingSet.visibility, { setId: existingSet.id });

  return {
    set: { id: setId, title: existingSet.title },
    cardsCreated: cards.length,
    skippedRows: 0,
  };
}

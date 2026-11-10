/** Set details a pasted import JSON may carry in its optional `set` object. */
export type JsonSetMeta = {
  title?: string;
  description?: string;
  language?: string;
};

type ImportFormSet = {
  title: string;
  description: string;
  visibility: 'PRIVATE' | 'PUBLIC';
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** Reads `set.title` / `set.description` / `set.language`; null when the text is not such JSON. */
export function readJsonSetMeta(text: string): JsonSetMeta | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || !isRecord(parsed.set)) return null;
  const meta: JsonSetMeta = {
    title: nonEmpty(parsed.set.title),
    description: nonEmpty(parsed.set.description),
    language: nonEmpty(parsed.set.language),
  };
  return meta.title || meta.description || meta.language ? meta : null;
}

/**
 * Request body for a JSON import. The form wins over the file's `set` (the file only
 * pre-fills it), except that an empty form field falls back to the file's value.
 * Visibility always comes from the form, so a file cannot make a set public.
 * `form` is null when importing into an existing set, where set details are ignored.
 */
export function buildJsonImportBody(parsed: unknown, form: ImportFormSet | null) {
  const cards = isRecord(parsed) ? parsed.cards : undefined;
  if (!form) return { format: 'json' as const, cards };

  const fileSet = isRecord(parsed) && isRecord(parsed.set) ? parsed.set : {};
  return {
    format: 'json' as const,
    set: {
      title: form.title.trim() || nonEmpty(fileSet.title) || '',
      description: form.description.trim() || nonEmpty(fileSet.description),
      language: nonEmpty(fileSet.language),
      visibility: form.visibility,
    },
    cards,
  };
}

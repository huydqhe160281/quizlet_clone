export type CatalogMessages = Record<string, unknown>;

function getByPath(messages: CatalogMessages, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, messages);
}

export function t(
  catalog: CatalogMessages,
  key: string,
  interpolations?: Record<string, string | number>
): string {
  const value = getByPath(catalog, key);
  if (typeof value !== 'string') {
    return key;
  }
  if (!interpolations) {
    return value;
  }
  return value.replace(/\{(\w+)\}/g, (_, name: string) => {
    const replacement = interpolations[name];
    return replacement === undefined ? `{${name}}` : String(replacement);
  });
}

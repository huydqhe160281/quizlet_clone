/** Public set lists (library + search pages). Set mutations invalidate `all`. */
export const publicSetKeys = {
  all: ['public-sets'] as const,
  library: (sort: string) => [...publicSetKeys.all, 'library', sort] as const,
  search: (query: string) => [...publicSetKeys.all, 'search', query] as const,
};

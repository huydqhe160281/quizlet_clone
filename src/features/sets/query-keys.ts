export const setKeys = {
  all: ['sets'] as const,
  list: () => [...setKeys.all, 'list'] as const,
  detail: (setId: string) => [...setKeys.all, 'detail', setId] as const,
  cards: (setId: string) => [...setKeys.all, 'cards', setId] as const,
};

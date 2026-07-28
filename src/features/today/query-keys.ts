export const todayKeys = {
  all: ['today'] as const,
  plan: () => [...todayKeys.all, 'plan'] as const,
};

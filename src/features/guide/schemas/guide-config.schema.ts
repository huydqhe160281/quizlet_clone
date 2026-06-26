import { z } from 'zod';

export const guideTargetSchema = z.object({
  id: z.string(),
  selector: z.string(),
  label: z.string(),
});

export const guideMenuSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
  description: z.string().optional(),
});

export const guideRouteSchema = z.object({
  path: z.string(),
  title: z.string(),
  auth: z.enum(['public', 'required', 'guest-only']),
  flows: z.array(z.string()).optional(),
});

export const guideFlowSchema = z.object({
  id: z.string(),
  title: z.string(),
  steps: z.array(z.string()),
});

export const guideFaqSchema = z.object({
  q: z.string(),
  a: z.string(),
});

export const guideConfigSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  site: z.object({
    name: z.string(),
    locale: z.string(),
  }),
  menus: z.array(guideMenuSchema),
  routes: z.array(guideRouteSchema),
  flows: z.array(guideFlowSchema),
  faq: z.array(guideFaqSchema),
  guideTargets: z.array(guideTargetSchema),
});

export type GuideConfig = z.infer<typeof guideConfigSchema>;
export type GuideUserContext = {
  setCount: number;
  hasSets: boolean;
  recentSetIds: string[];
};

export class GuideConfigError extends Error {
  constructor(
    public code: 'INVALID_CONFIG',
    message: string
  ) {
    super(message);
    this.name = 'GuideConfigError';
  }
}

export function parseGuideConfig(raw: unknown): GuideConfig {
  const parsed = guideConfigSchema.safeParse(raw);
  if (!parsed.success) {
    throw new GuideConfigError('INVALID_CONFIG', parsed.error.message);
  }
  return parsed.data;
}

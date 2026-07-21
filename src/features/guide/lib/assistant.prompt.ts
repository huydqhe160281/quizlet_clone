import type { GuideConfig, GuideUserContext } from '@/features/guide/schemas/guide-config.schema';
import { DEFAULT_LOCALE, type Locale, isLocale } from '@/lib/i18n/constants';
import { loadCatalog } from '@/lib/i18n/catalog';
import { t } from '@/lib/i18n/t';

export function buildSystemPrompt(
  config: GuideConfig,
  options?: {
    userContext?: GuideUserContext;
    pathname?: string;
    locale?: string;
  }
): string {
  const locale: Locale = isLocale(options?.locale) ? options.locale : DEFAULT_LOCALE;
  const catalog = loadCatalog(locale);
  const appName = t(catalog, 'app.name') || config.site.name;
  const role = t(catalog, 'guide.role', { appName });
  const outOfScope = t(catalog, 'guide.outOfScope', { appName });
  const formatRules = t(catalog, 'guide.formatRules');

  const configJson = JSON.stringify(
    {
      site: { ...config.site, locale },
      menus: config.menus,
      routes: config.routes.filter((r) => !r.path.includes('[')),
      flows: config.flows,
      faq: config.faq,
    },
    null,
    2
  );

  const userBlock = options?.userContext
    ? `\n${t(catalog, 'guide.userContextLabel')}\n${JSON.stringify(options.userContext)}`
    : '';

  const pathBlock = options?.pathname
    ? `\n${t(catalog, 'guide.currentPageLabel')} ${options.pathname}`
    : '';

  return `${role}
${outOfScope}

${formatRules}

${configJson}${userBlock}${pathBlock}`;
}

export function isOutOfScopeTopic(content: string): boolean {
  const lowered = content.toLowerCase();
  const offTopicHints = [
    'thời tiết',
    'weather',
    'bóng đá',
    'chính trị',
    'giá vàng',
    '天気',
    '政治',
  ];
  return offTopicHints.some((hint) => lowered.includes(hint));
}

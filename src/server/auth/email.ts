import { Resend } from 'resend';
import { env } from '@/config/env';
import { DEFAULT_LOCALE, type Locale, isLocale } from '@/lib/i18n/constants';
import { loadCatalog } from '@/lib/i18n/catalog';
import { t } from '@/lib/i18n/t';

export type PasswordResetEmailContent = {
  subject: string;
  html: string;
};

export function resolveEmailLocale(
  preferredLocale: string | null | undefined,
  cookieLocale?: string | null
): Locale {
  if (isLocale(preferredLocale)) return preferredLocale;
  if (isLocale(cookieLocale)) return cookieLocale;
  return DEFAULT_LOCALE;
}

export function renderPasswordResetEmail(
  resetUrl: string,
  locale: Locale
): PasswordResetEmailContent {
  const catalog = loadCatalog(locale);
  const subject = t(catalog, 'emails.passwordReset.subject');
  const intro = t(catalog, 'emails.passwordReset.intro');
  const cta = t(catalog, 'emails.passwordReset.cta');
  const expiry = t(catalog, 'emails.passwordReset.expiry');
  const ignore = t(catalog, 'emails.passwordReset.ignore');

  return {
    subject,
    html: `
    <p>${intro}</p>
    <p><a href="${resetUrl}">${cta}</a></p>
    <p>${expiry}</p>
    <p>${ignore}</p>
  `,
  };
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  locale: Locale = DEFAULT_LOCALE
): Promise<void> {
  const { subject, html } = renderPasswordResetEmail(resetUrl, locale);

  if (!env.resendApiKey) {
    console.info(`[dev] Password reset link for ${email}: ${resetUrl}`);
    return;
  }

  const resend = new Resend(env.resendApiKey);
  await resend.emails.send({
    from: 'QuizFree <onboarding@resend.dev>',
    to: email,
    subject,
    html,
  });
}

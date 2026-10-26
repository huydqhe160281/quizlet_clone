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

export function renderEmailVerificationEmail(
  verifyUrl: string,
  locale: Locale
): PasswordResetEmailContent {
  const catalog = loadCatalog(locale);
  return {
    subject: t(catalog, 'emails.verifyEmail.subject'),
    html: `
    <p>${t(catalog, 'emails.verifyEmail.intro')}</p>
    <p><a href="${verifyUrl}">${t(catalog, 'emails.verifyEmail.cta')}</a></p>
    <p>${t(catalog, 'emails.verifyEmail.expiry')}</p>
    <p>${t(catalog, 'emails.verifyEmail.ignore')}</p>
  `,
  };
}

async function sendEmail(email: string, content: PasswordResetEmailContent, devLink: string) {
  if (!env.resendApiKey) {
    console.info(`[dev] Email for ${email} (${content.subject}): ${devLink}`);
    return;
  }

  const resend = new Resend(env.resendApiKey);
  // The SDK reports API failures (bad key, unverified recipient) as `{ error }`, not by throwing.
  const { error } = await resend.emails.send({
    from: 'QuizFree <onboarding@resend.dev>',
    to: email,
    subject: content.subject,
    html: content.html,
  });
  if (error) {
    throw new Error(`Email send failed: ${error.name}: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string,
  locale: Locale = DEFAULT_LOCALE
): Promise<void> {
  await sendEmail(email, renderPasswordResetEmail(resetUrl, locale), resetUrl);
}

export function renderAccountClaimedEmail(
  forgotPasswordUrl: string,
  locale: Locale
): PasswordResetEmailContent {
  const catalog = loadCatalog(locale);
  return {
    subject: t(catalog, 'emails.accountClaimed.subject'),
    html: `
    <p>${t(catalog, 'emails.accountClaimed.intro')}</p>
    <p>${t(catalog, 'emails.accountClaimed.passwordRemoved')}</p>
    <p><a href="${forgotPasswordUrl}">${t(catalog, 'emails.accountClaimed.cta')}</a></p>
    <p>${t(catalog, 'emails.accountClaimed.ignore')}</p>
  `,
  };
}

/** Sent after a Google sign-in took over an unverified password account (google-account-claim). */
export async function sendAccountClaimedEmail(
  email: string,
  forgotPasswordUrl: string,
  locale: Locale = DEFAULT_LOCALE
): Promise<void> {
  await sendEmail(email, renderAccountClaimedEmail(forgotPasswordUrl, locale), forgotPasswordUrl);
}

export async function sendEmailVerificationEmail(
  email: string,
  verifyUrl: string,
  locale: Locale = DEFAULT_LOCALE
): Promise<void> {
  await sendEmail(email, renderEmailVerificationEmail(verifyUrl, locale), verifyUrl);
}

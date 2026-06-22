import { Resend } from 'resend';
import { env } from '@/lib/env';

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const subject = 'Reset your Flashcards password';
  const html = `
    <p>You requested a password reset.</p>
    <p><a href="${resetUrl}">Click here to reset your password</a></p>
    <p>This link expires in 1 hour.</p>
    <p>If you did not request this, you can ignore this email.</p>
  `;

  if (!env.resendApiKey) {
    console.info(`[dev] Password reset link for ${email}: ${resetUrl}`);
    return;
  }

  const resend = new Resend(env.resendApiKey);
  await resend.emails.send({
    from: 'Flashcards <onboarding@resend.dev>',
    to: email,
    subject,
    html,
  });
}

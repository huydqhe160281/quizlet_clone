import type { AiGenerateJobError } from '@/features/sets/ai-generate-job-store';
import { AI_GENERATE_UNVERIFIED_DAILY_LIMIT } from '@/lib/auth/verification-policy';
import { apiErrorMessage } from '@/lib/i18n/api-error-message';

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** User-facing text for a failed AI set generation job. */
export function aiGenerateErrorMessage(t: Translate, error: AiGenerateJobError): string {
  switch (error.kind) {
    case 'quota-unverified':
      return t('apiErrors.AI_QUOTA_UNVERIFIED', {
        limit: error.limit ?? AI_GENERATE_UNVERIFIED_DAILY_LIMIT,
      });
    case 'rate-limit':
      return t('aiGenerate.errorRateLimit');
    case 'network':
      return t('aiGenerate.errorNetwork');
    case 'api':
      return apiErrorMessage(t, error.payload, 'aiGenerate.errorGenerateFailed');
  }
}

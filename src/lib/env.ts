import {
  resolveOllamaApiKey,
  resolveOllamaBaseUrl,
  resolveOllamaLargeModel,
  resolveOllamaModel,
} from '@/lib/ollama-env';

const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const resolveAuthUrl = (): string => {
  const urls = [process.env.AUTH_URL, process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_APP_URL];

  for (const url of urls) {
    if (url && url.trim() !== '') {
      return url.trim().replace(/\/$/, '');
    }
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.trim() !== '') {
    const trimmed = vercelUrl.trim().replace(/\/$/, '');
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000';
  }

  throw new Error(
    'Missing required environment variable for Application URL (AUTH_URL, NEXTAUTH_URL, NEXT_PUBLIC_APP_URL, or VERCEL_URL) in production.'
  );
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  authSecret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? required('NEXTAUTH_SECRET'),
  authUrl: resolveAuthUrl(),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  googleAuthEnabled:
    Boolean(process.env.GOOGLE_CLIENT_ID?.trim()) &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim()),
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  mediaBucket: process.env.SUPABASE_MEDIA_BUCKET ?? 'flashcard-media',
  ollamaBaseUrl: resolveOllamaBaseUrl(
    process.env.NODE_ENV ?? 'development',
    process.env.OLLAMA_BASE_URL
  ),
  ollamaModel: resolveOllamaModel(process.env.NODE_ENV ?? 'development', process.env.OLLAMA_MODEL),
  ollamaLargeModel: resolveOllamaLargeModel(process.env.OLLAMA_MODEL_LARGE),
  ollamaApiKey: resolveOllamaApiKey(process.env.OLLAMA_API_KEY),
};

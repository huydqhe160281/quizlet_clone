const required = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  authSecret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? required('NEXTAUTH_SECRET'),
  authUrl: process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  mediaBucket: process.env.SUPABASE_MEDIA_BUCKET ?? 'flashcard-media',
};

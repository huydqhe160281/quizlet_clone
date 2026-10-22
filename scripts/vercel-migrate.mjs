// Runs `prisma migrate deploy` during the Vercel build, but only for production
// deployments. Preview builds of unmerged branches must never migrate the
// production database (Preview usually shares DIRECT_DATABASE_URL).
// Set MIGRATE_ON_PREVIEW=1 when Preview points at its own database.
import { spawnSync } from 'node:child_process';

/** @param {Record<string, string | undefined>} env */
export function shouldRunMigrations(env) {
  const vercelEnv = env.VERCEL_ENV;
  // Outside Vercel (local `vercel build`, other CI) keep the previous behaviour.
  if (!vercelEnv) return true;
  if (vercelEnv === 'production') return true;
  return env.MIGRATE_ON_PREVIEW === '1';
}

if (process.argv[1]?.includes('vercel-migrate')) {
  if (!shouldRunMigrations(process.env)) {
    console.log(
      `[vercel-migrate] skipping prisma migrate deploy (VERCEL_ENV=${process.env.VERCEL_ENV})`
    );
    process.exit(0);
  }
  const result = spawnSync('prisma', ['migrate', 'deploy'], { stdio: 'inherit', shell: true });
  process.exit(result.status ?? 1);
}

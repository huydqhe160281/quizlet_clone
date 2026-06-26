import fs from 'node:fs';
import path from 'node:path';
import type { GuideConfig } from '@/features/guide/schemas/guide-config.schema';
import { parseGuideConfig } from '@/features/guide/schemas/guide-config.schema';

const CONFIG_PATH = path.join(process.cwd(), 'src/generated/guide-config.json');

let cachedConfig: GuideConfig | null = null;

export function loadGuideConfig(): GuideConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  cachedConfig = parseGuideConfig(JSON.parse(raw));
  return cachedConfig;
}

export function resetGuideConfigCache(): void {
  cachedConfig = null;
}

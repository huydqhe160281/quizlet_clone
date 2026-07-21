import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT, 'src', 'app');
const OUTPUT = path.join(ROOT, 'src', 'generated', 'guide-config.json');
const DOCS_GUIDE = path.join(ROOT, 'docs', 'guide');
const GUIDE_CONFIG_MAX_BYTES = 51_200;

const STUDY_NAV_ENABLED = false;

const APP_NAV_ITEMS = [
  { id: 'dashboard', href: '/dashboard', labelKey: 'nav.dashboard', guideTargetId: 'nav-dashboard' },
  { id: 'sets', href: '/sets', labelKey: 'nav.sets', guideTargetId: 'nav-sets' },
  ...(STUDY_NAV_ENABLED
    ? [{ id: 'study', href: '/study', labelKey: 'nav.study', guideTargetId: 'nav-study' }]
    : []),
  { id: 'search', href: '/search', labelKey: 'nav.search', guideTargetId: 'nav-search' },
  { id: 'library', href: '/library', labelKey: 'nav.library', guideTargetId: 'nav-library' },
];

function titleFromSegment(segment) {
  if (segment.startsWith('[') && segment.endsWith(']')) {
    return segment.slice(1, -1);
  }
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function inferAuth(segments) {
  if (segments.includes('(auth)')) return 'guest-only';
  if (segments.includes('(app)')) return 'required';
  return 'public';
}

function scanRoutes(dir, segments = []) {
  if (!fs.existsSync(dir)) return [];

  const routes = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...scanRoutes(fullPath, [...segments, entry.name]));
      continue;
    }
    if (entry.name !== 'page.tsx') continue;

    const urlSegments = segments.filter((s) => !s.startsWith('('));
    const routePath = urlSegments.length === 0 ? '/' : `/${urlSegments.join('/')}`;
    const lastSegment = urlSegments[urlSegments.length - 1] ?? 'home';
    routes.push({ path: routePath, title: titleFromSegment(lastSegment), auth: inferAuth(segments) });
  }
  return routes;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadFlows() {
  const flowsDir = path.join(DOCS_GUIDE, 'flows');
  if (!fs.existsSync(flowsDir)) return [];
  return fs
    .readdirSync(flowsDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => loadJson(path.join(flowsDir, name)));
}

function loadFaq() {
  const faqPath = path.join(DOCS_GUIDE, 'faq.vi.json');
  if (!fs.existsSync(faqPath)) return [];
  return loadJson(faqPath);
}

export function buildGuideConfig() {
  const routes = scanRoutes(APP_DIR);
  const uniqueRoutes = Array.from(new Map(routes.map((r) => [r.path, r])).values()).sort((a, b) =>
    a.path.localeCompare(b.path)
  );

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    // Locale is resolved at request time from messages/{locale}/guide.json — do not freeze UI copy here.
    site: { name: 'QuizFree', locale: 'runtime' },
    menus: APP_NAV_ITEMS.map((item) => ({
      id: item.id,
      label: item.labelKey,
      href: item.href,
      description: item.labelKey,
    })),
    routes: uniqueRoutes,
    flows: loadFlows(),
    faq: loadFaq(),
    guideTargets: APP_NAV_ITEMS.map((item) => ({
      id: item.guideTargetId,
      selector: `[data-guide=${item.guideTargetId}]`,
      label: item.labelKey,
    })),
  };
}

export function writeGuideConfig(outputPath = OUTPUT) {
  const config = buildGuideConfig();
  const json = `${JSON.stringify(config, null, 2)}\n`;
  const bytes = Buffer.byteLength(json, 'utf8');

  if (process.env.GUIDE_CONFIG_STRICT === 'true' && bytes > GUIDE_CONFIG_MAX_BYTES) {
    console.error(`Guide config exceeds ${GUIDE_CONFIG_MAX_BYTES} bytes (${bytes})`);
    process.exit(1);
  }

  if (config.routes.length === 0) {
    console.warn('No routes discovered during guide config generation');
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, json, 'utf8');
  return bytes;
}

if (process.argv[1]?.includes('generate-guide-config')) {
  const bytes = writeGuideConfig();
  console.log(`Wrote ${OUTPUT} (${bytes} bytes)`);
}

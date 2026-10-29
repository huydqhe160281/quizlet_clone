#!/usr/bin/env node
/**
 * Generates the QuizFree brand icons from one SVG mark: a white flashcard with a
 * check, stacked on a second card, on the app's primary violet (hsl(255 85% 55%)).
 * Outputs are committed; re-run after changing the mark:
 *   node scripts/generate-icons.mjs
 *
 * `sharp` comes from Next.js' image optimizer dependency.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const out = (rel) => path.join(root, rel);

const GRADIENT_FROM = '#7C5CFF';
const GRADIENT_TO = '#5B2BEE';

/**
 * @param {{ rounded: boolean; scale?: number }} opts
 *   rounded — rounded-square tile with transparent corners (favicon, "any" PWA icon);
 *   otherwise full-bleed for platforms that apply their own mask (iOS, maskable).
 *   scale — shrinks the mark around the center (maskable safe zone is the inner 80%).
 */
export const buildIconSvg = ({
  rounded,
  scale = 1,
}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${GRADIENT_FROM}"/>
      <stop offset="1" stop-color="${GRADIENT_TO}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${rounded ? 116 : 0}" fill="url(#bg)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <rect x="150" y="104" width="250" height="290" rx="44" fill="#fff" fill-opacity=".38" transform="rotate(12 275 249)"/>
    <rect x="112" y="132" width="250" height="290" rx="44" fill="#fff"/>
    <path d="M170 280l50 50 92-100" fill="none" stroke="${GRADIENT_TO}" stroke-width="44" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
`;

const png = (svg, size) =>
  sharp(Buffer.from(svg), { density: Math.max(72, (72 * size) / 512) * 4 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();

/** ICO container with PNG-encoded entries (supported by every current browser). */
const ico = (images) => {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.data)]);
};

const tile = buildIconSvg({ rounded: true });
const fullBleed = buildIconSvg({ rounded: false });
const maskable = buildIconSvg({ rounded: false, scale: 0.78 });

mkdirSync(out('public/icons'), { recursive: true });
writeFileSync(out('src/app/icon.svg'), tile);
writeFileSync(
  out('src/app/favicon.ico'),
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(tile, size) }))))
);
writeFileSync(out('src/app/apple-icon.png'), await png(fullBleed, 180));
writeFileSync(out('public/icons/icon-192.png'), await png(tile, 192));
writeFileSync(out('public/icons/icon-512.png'), await png(tile, 512));
writeFileSync(out('public/icons/maskable-512.png'), await png(maskable, 512));

console.log('Icons written to src/app and public/icons');

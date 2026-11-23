// Generates PNG app icons into ./public and Android launcher source (resources/icon.png) from an SVG.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const art = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#c4623f"/>
  <circle cx="256" cy="256" r="${pad ? 150 : 205}" fill="#fbf5e9" opacity="0.95"/>
  <g transform="translate(256 262) scale(${pad ? 0.62 : 0.86}) translate(-256 -262)">
    <path d="M90 270h332c0 92-74 150-166 150S90 362 90 270z" fill="#6b8e5a"/>
    <rect x="76" y="250" width="360" height="30" rx="15" fill="#567548"/>
    <path d="M190 215c-24-26 24-42 0-72M256 205c-24-26 24-42 0-72M322 215c-24-26 24-42 0-72" stroke="#c4623f" stroke-width="16" stroke-linecap="round" fill="none"/>
    <circle cx="256" cy="330" r="16" fill="#fbf5e9" opacity="0.8"/>
  </g>
</svg>`;
mkdirSync(join(root, 'public'), { recursive: true });
mkdirSync(join(root, 'resources'), { recursive: true });
for (const [name, size, pad] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true]]) {
  await sharp(Buffer.from(art(pad))).resize(size, size).png().toFile(join(root, 'public', name));
}
await sharp(Buffer.from(art(true))).resize(1024, 1024).png().toFile(join(root, 'resources', 'icon.png'));
writeFileSync(join(root, 'resources', 'README.txt'), 'icon.png – source launcher icon (1024x1024). Used by CI to generate Android launcher icons.\n');
console.log('icons written');

import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'public', 'brand', 'rota-cam.svg');
const outDir = join(root, 'public', 'icons');

const svg = readFileSync(svgPath);

mkdirSync(outDir, { recursive: true });

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(join(outDir, `icon-${size}.png`));
}

// Ícone “maskable” com margem segura para PWA
const maskable = 512;
const inner = Math.round(maskable * 0.72);
const resized = await sharp(svg, { density: 300 })
  .resize(inner, inner)
  .png()
  .toBuffer();

await sharp({
  create: {
    width: maskable,
    height: maskable,
    channels: 4,
    background: { r: 20, g: 20, b: 20, alpha: 1 },
  },
})
  .composite([{ input: resized, gravity: 'center' }])
  .png()
  .toFile(join(outDir, 'icon-maskable-512.png'));

console.log('[gen:icons] Gerados PNG em public/icons/');

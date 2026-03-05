import sharp from 'sharp';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const ICONS_DIR = join(process.cwd(), 'public', 'icons');
const PUBLIC_DIR = join(process.cwd(), 'public');

if (!existsSync(ICONS_DIR)) {
  mkdirSync(ICONS_DIR, { recursive: true });
}

const SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];

function createSVG(size) {
  const fontSize = size * 0.42;
  const centerX = size / 2;
  const centerY = size / 2;
  const textY = centerY + fontSize * 0.35;
  const radius = size * 0.12;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)" rx="${radius}" ry="${radius}"/>
  <text x="${centerX}" y="${textY}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="${fontSize}" fill="white" text-anchor="middle" letter-spacing="${fontSize * 0.05}">GD</text>
</svg>`;
}

function createMaskableSVG(size) {
  const fontSize = size * 0.42 * 0.8;
  const centerX = size / 2;
  const centerY = size / 2;
  const textY = centerY + fontSize * 0.35;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#8b5cf6"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <text x="${centerX}" y="${textY}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="${fontSize}" fill="white" text-anchor="middle" letter-spacing="${fontSize * 0.05}">GD</text>
</svg>`;
}

async function generateIcons() {
  console.log('Generating PWA icons...\n');

  for (const size of SIZES) {
    const svg = createSVG(size);
    const outputPath = join(ICONS_DIR, `icon-${size}x${size}.png`);
    await sharp(Buffer.from(svg)).png().toFile(outputPath);
    console.log(`  Created: icons/icon-${size}x${size}.png`);
  }

  const maskableSVG = createMaskableSVG(512);
  await sharp(Buffer.from(maskableSVG)).png().toFile(join(ICONS_DIR, 'icon-512x512-maskable.png'));
  console.log('  Created: icons/icon-512x512-maskable.png');

  const appleSVG = createSVG(180);
  await sharp(Buffer.from(appleSVG)).png().toFile(join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('  Created: apple-touch-icon.png');

  await sharp(Buffer.from(createSVG(32))).png().toFile(join(PUBLIC_DIR, 'favicon-32x32.png'));
  console.log('  Created: favicon-32x32.png');

  await sharp(Buffer.from(createSVG(16))).png().toFile(join(PUBLIC_DIR, 'favicon-16x16.png'));
  console.log('  Created: favicon-16x16.png');

  await sharp(Buffer.from(createSVG(48))).png().toFile(join(PUBLIC_DIR, 'favicon.png'));
  console.log('  Created: favicon.png');

  writeFileSync(join(PUBLIC_DIR, 'icon.svg'), createSVG(512));
  console.log('  Created: icon.svg');

  console.log('\nAll icons generated successfully!');
}

generateIcons().catch(console.error);

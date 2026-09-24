import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// The supplied photo is the approved AURA mark. Keep it byte-for-byte as the
// source of truth; generated icons only resize or mask it for platform use.
const source = await readFile(join(root, 'assets', 'brand', 'aura-original.jpg'));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1536"><image width="1536" height="1536" href="data:image/jpeg;base64,${source.toString('base64')}"/></svg>\n`;
await writeFile(join(root, 'public', 'icon.svg'), svg);

// Preserve the supplied artwork's RGB pixels while removing the nearly black
// matte. The central openings of the A and heart become transparent as well.
const { data: cutoutPixels, info: cutoutInfo } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
for (let i = 0; i < cutoutPixels.length; i += 4) {
  const brightness = Math.max(cutoutPixels[i], cutoutPixels[i + 1], cutoutPixels[i + 2]);
  const t = Math.max(0, Math.min(1, (brightness - 40) / 65));
  cutoutPixels[i + 3] = Math.round(255 * t * t * (3 - 2 * t));
}
const transparentLogo = await sharp(cutoutPixels, { raw: cutoutInfo }).png().toBuffer();
await writeFile(join(root, 'assets', 'brand', 'aura-mark-transparent.png'), transparentLogo);

async function png(path, input, size) {
  await mkdir(dirname(path), { recursive: true });
  await sharp(input).resize(size, size).png().toFile(path);
}

for (const size of [192, 512]) {
  await png(join(root, 'public', `icon-${size}.png`), transparentLogo, size);
}
const maskableLogo = await sharp(transparentLogo).resize(430, 430).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#00000000' } })
  .composite([{ input: maskableLogo, left: 41, top: 41 }])
  .png()
  .toFile(join(root, 'public', 'icon-maskable-512.png'));
await png(join(root, 'public', 'apple-touch-icon.png'), transparentLogo, 180);
await png(join(root, 'android', 'play-store-icon-512.png'), transparentLogo, 512);
const iosAssets = join(root, 'ios', 'App', 'App', 'Assets.xcassets');
const iosIconSet = join(iosAssets, 'AppIcon.appiconset');
await png(join(iosIconSet, 'AppIcon-1024.png'), source, 1024);
await writeFile(join(iosAssets, 'Contents.json'), JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2) + '\n');
await writeFile(join(iosIconSet, 'Contents.json'), JSON.stringify({
  images: [{ filename: 'AppIcon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }],
  info: { author: 'xcode', version: 1 }
}, null, 2) + '\n');

const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [density, scale] of Object.entries(densities)) {
  const dir = join(root, 'android', 'app', 'src', 'main', 'res', `mipmap-${density}`);
  const size = Math.round(48 * scale);
  await png(join(dir, 'ic_launcher.png'), transparentLogo, size);
  const foregroundSize = Math.round(108 * scale);
  const logoSize = Math.round(foregroundSize * .82);
  const logo = await sharp(transparentLogo).resize(logoSize, logoSize).png().toBuffer();
  const offset = Math.floor((foregroundSize - logoSize) / 2);
  await sharp({ create: { width: foregroundSize, height: foregroundSize, channels: 4, background: '#00000000' } })
    .composite([{ input: logo, left: offset, top: offset }])
    .png()
    .toFile(join(dir, 'ic_launcher_foreground.png'));

  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`);
  const rounded = await sharp(transparentLogo).resize(size, size).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  await writeFile(join(dir, 'ic_launcher_round.png'), rounded);
}

await writeFile(join(root, 'ios', 'App', 'App', 'public', 'icon.svg'), svg);
for (const size of [192, 512]) {
  await png(join(root, 'ios', 'App', 'App', 'public', `icon-${size}.png`), transparentLogo, size);
}
await png(join(root, 'ios', 'App', 'App', 'public', 'apple-touch-icon.png'), transparentLogo, 180);

console.log('Generated PWA, Android and iOS icons from the approved AURA logo.');

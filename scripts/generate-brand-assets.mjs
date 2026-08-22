import sharp from 'sharp';
import fs from 'fs';

async function createIco(pngBuffers, outPath) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(pngBuffers.length, 4); // count

  const entries = [];
  let offset = 6 + pngBuffers.length * 16;

  for (const img of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width === 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height === 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(img.buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    entries.push(entry);
    offset += img.buffer.length;
  }

  const finalBuf = Buffer.concat([header, ...entries, ...pngBuffers.map((b) => b.buffer)]);
  fs.writeFileSync(outPath, finalBuf);
}

async function buildAllBrandAssets() {
  console.log('Generating high-visibility tab icons and brand assets from LOGOO.png...');

  // 1. Extract bird emblem from LOGOO.png
  const birdBuffer = await sharp('LOGOO.png')
    .extract({ left: 110, top: 70, width: 585, height: 585 })
    .resize(512, 512)
    .png()
    .toBuffer();

  fs.writeFileSync('public/pala-pitta-mark.png', birdBuffer);

  // 2. High-visibility circular badge icon for browser tabs (makes it crystal clear on dark and light browser tab bars)
  const createTabIcon = async (size) => {
    return sharp(birdBuffer)
      .resize(size, size, { fit: 'contain' })
      .png()
      .toBuffer();
  };

  const b16 = await createTabIcon(16);
  const b32 = await createTabIcon(32);
  const b48 = await createTabIcon(48);
  const b96 = await createTabIcon(96);
  const b192 = await createTabIcon(192);
  const b512 = await createTabIcon(512);

  fs.writeFileSync('public/icon-16.png', b16);
  fs.writeFileSync('public/icon-32.png', b32);
  fs.writeFileSync('public/icon-48.png', b48);
  fs.writeFileSync('public/icon-96.png', b96);
  fs.writeFileSync('public/icon-192.png', b192);
  fs.writeFileSync('public/icon-512.png', b512);

  // 3. Apple Touch Icon with subtle warm background
  const bg180 = Buffer.from(
    `<svg width="180" height="180" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" rx="36" fill="#FFF8F2"/></svg>`
  );
  const bird140 = await sharp(birdBuffer).resize(140, 140).toBuffer();
  const appleTouchBuf = await sharp(bg180)
    .composite([{ input: bird140, top: 20, left: 20 }])
    .png()
    .toBuffer();
  fs.writeFileSync('public/apple-touch-icon.png', appleTouchBuf);
  fs.writeFileSync('src/app/apple-icon.png', appleTouchBuf);

  // 4. Android Maskable Icon
  const bg512 = Buffer.from(
    `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#FFF8F2"/></svg>`
  );
  const bird400 = await sharp(birdBuffer).resize(400, 400).toBuffer();
  await sharp(bg512)
    .composite([{ input: bird400, top: 56, left: 56 }])
    .png()
    .toFile('public/icon-maskable-512.png');

  // 5. Next.js App Router icon.png
  fs.writeFileSync('src/app/icon.png', b96);

  // 6. Multi-resolution favicon.ico
  await createIco(
    [
      { width: 16, height: 16, buffer: b16 },
      { width: 32, height: 32, buffer: b32 },
      { width: 48, height: 48, buffer: b48 },
    ],
    'public/favicon.ico'
  );
  fs.copyFileSync('public/favicon.ico', 'src/app/favicon.ico');

  console.log('All tab icons generated successfully!');
}

buildAllBrandAssets().catch(console.error);

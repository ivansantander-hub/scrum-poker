const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const CHARACTERS_DIR = path.join(__dirname, '../frontend/public/characters');

async function optimizeImages() {
  const files = fs.readdirSync(CHARACTERS_DIR);
  const jpgFiles = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  const gifFiles = files.filter(f => /\.gif$/i.test(f));

  console.log(`\n🖼️  Image Optimizer\n${'='.repeat(40)}`);
  console.log(`Found ${jpgFiles.length} images to convert (jpg/png → webp)`);
  console.log(`Found ${gifFiles.length} images to keep as-is (gif)\n`);

  let converted = 0;
  let skipped = 0;

  for (const file of jpgFiles) {
    const inputPath = path.join(CHARACTERS_DIR, file);
    const nameWithoutExt = file.replace(/\.(jpg|jpeg|png)$/i, '');
    const outputPath = path.join(CHARACTERS_DIR, `${nameWithoutExt}.webp`);

    try {
      const statsBefore = fs.statSync(inputPath);
      const sizeBefore = statsBefore.size;

      await sharp(inputPath)
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(outputPath);

      const statsAfter = fs.statSync(outputPath);
      const sizeAfter = statsAfter.size;
      const savings = ((sizeBefore - sizeAfter) / sizeBefore * 100).toFixed(1);

      fs.unlinkSync(inputPath);
      converted++;
      console.log(`  ✓ ${file} → ${nameWithoutExt}.webp (${formatSize(sizeBefore)} → ${formatSize(sizeAfter)}, -${savings}%)`);
    } catch (err) {
      console.error(`  ✗ Failed to convert ${file}:`, err.message);
      skipped++;
    }
  }

  console.log(`\n${'='.repeat(40)}`);
  console.log(`✅ Converted: ${converted} images`);
  console.log(`⏭️  Skipped: ${skipped} images`);
  console.log(`🎞️  GIFs kept: ${gifFiles.length} images`);
  console.log(`\n📁 Output: ${CHARACTERS_DIR}\n`);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

optimizeImages().catch(console.error);

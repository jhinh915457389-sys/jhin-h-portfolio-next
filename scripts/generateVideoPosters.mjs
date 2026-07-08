import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getPublicImageSize } from './imageMetadata.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const itemsPath = path.join(projectRoot, 'public', 'data', 'portfolio-items.json');
const outputRoot = path.join(projectRoot, 'public', 'assets', 'video-posters');
const tmpRoot = path.join(projectRoot, 'tmp', 'videos');

function slugify(input) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function downloadFile(url, filePath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download video: ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

async function main() {
  const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
  const videoItems = items.filter((item) => item.type === 'video');

  fs.mkdirSync(outputRoot, { recursive: true });
  fs.mkdirSync(tmpRoot, { recursive: true });

  for (const item of videoItems) {
    const slug = slugify(item.title);
    const ext = item.assets[0].extension || 'mp4';
    const videoPath = path.join(tmpRoot, `${slug}.${ext.toLowerCase()}`);
    const posterPath = path.join(outputRoot, `${slug}.jpg`);

    if (!fs.existsSync(videoPath)) await downloadFile(item.assets[0].url, videoPath);

    if (!fs.existsSync(posterPath)) {
      execFileSync(
        'ffmpeg',
        ['-y', '-ss', '00:00:01', '-i', videoPath, '-frames:v', '1', '-q:v', '3', posterPath],
        { stdio: 'pipe' },
      );
    }

    item.cover = `/assets/video-posters/${slug}.jpg`;
    item.poster = item.cover;
    const posterSize = getPublicImageSize(projectRoot, item.poster);
    if (posterSize) {
      item.coverWidth = posterSize.width;
      item.coverHeight = posterSize.height;
      item.posterWidth = posterSize.width;
      item.posterHeight = posterSize.height;
    }
    console.log(`${item.title}: ${item.poster}`);
  }

  fs.writeFileSync(itemsPath, `${JSON.stringify(items, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

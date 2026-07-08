import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { withLocalImageSize } from './imageMetadata.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const itemsPath = path.join(projectRoot, 'public', 'data', 'portfolio-items.json');
const outputRoot = path.join(projectRoot, 'public', 'assets', 'pdf-pages');
const tmpRoot = path.join(projectRoot, 'tmp', 'pdfs');
const manifestPath = path.join(projectRoot, 'public', 'data', 'pdf-pages.json');

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
  if (!response.ok) throw new Error(`Failed to download PDF: ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

function listRenderedPages(outputDir) {
  if (!fs.existsSync(outputDir)) return [];
  return fs
    .readdirSync(outputDir)
    .filter((filename) => /^page-\d+\.png$/.test(filename))
    .sort((left, right) => left.localeCompare(right, 'en', { numeric: true }))
    .map((filename, index) =>
      withLocalImageSize(projectRoot, {
        id: `${path.basename(outputDir)}-page-${index + 1}`,
        title: `Page ${index + 1}`,
        url: `/assets/pdf-pages/${path.basename(outputDir)}/${filename}`,
        filename,
        kind: 'image',
        source: 'pdf-render',
      }),
    );
}

function renderPdf(pdfPath, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  execFileSync('pdftoppm', ['-png', '-r', '144', pdfPath, path.join(outputDir, 'page')], {
    stdio: 'pipe',
  });
  return listRenderedPages(outputDir);
}

async function main() {
  const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
  const pdfItems = items.filter((item) => item.type === 'pdf');
  const manifest = {};

  fs.mkdirSync(outputRoot, { recursive: true });
  fs.mkdirSync(tmpRoot, { recursive: true });

  for (const item of pdfItems) {
    const slug = slugify(item.title);
    const pdfPath = path.join(tmpRoot, `${slug}.pdf`);
    const outputDir = path.join(outputRoot, slug);
    let pages = listRenderedPages(outputDir);

    if (pages.length === 0) {
      if (!fs.existsSync(pdfPath)) await downloadFile(item.assets[0].url, pdfPath);
      pages = renderPdf(pdfPath, outputDir);
    }

    manifest[item.id] = pages;
    item.cover = pages[0]?.url ?? item.cover;
    if (pages[0]?.width && pages[0]?.height) {
      item.coverWidth = pages[0].width;
      item.coverHeight = pages[0].height;
    }
    console.log(`${item.title}: ${pages.length} pages`);
  }

  fs.writeFileSync(itemsPath, `${JSON.stringify(items, null, 2)}\n`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(manifestPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

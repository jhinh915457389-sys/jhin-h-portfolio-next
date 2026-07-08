import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pdfPagesPath = path.join(projectRoot, 'public', 'data', 'pdf-pages.json');
const outPath = path.join(projectRoot, '03_交付成果', 'pdf-pages-cos-upload-manifest.json');
const defaultBaseUrl =
  'https://zuo-pin-ji-1319963503.cos.ap-guangzhou.myqcloud.com/个人网站搭建/pdf-pages';
const publicBaseUrl = process.env.PDF_PAGE_COS_BASE_URL || defaultBaseUrl;

function encodePath(pathname) {
  return pathname
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function main() {
  const pdfPages = JSON.parse(fs.readFileSync(pdfPagesPath, 'utf8'));
  const uploadEntries = [];

  for (const pages of Object.values(pdfPages)) {
    for (const page of pages) {
      if (!page.url?.startsWith('/assets/pdf-pages/')) continue;
      const relativePath = page.url.replace(/^\/assets\/pdf-pages\//, '');
      uploadEntries.push({
        localPath: page.url.replace(/^\//, 'public/'),
        targetKey: `个人网站搭建/pdf-pages/${relativePath}`,
        publicUrl: `${publicBaseUrl.replace(/\/$/, '')}/${encodePath(relativePath)}`,
        width: page.width,
        height: page.height,
      });
    }
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    `${JSON.stringify(
      {
        note: 'Upload these local PDF page images to COS, then switch pdf-pages.json URLs to publicUrl when deployment package size needs to shrink.',
        baseUrl: publicBaseUrl,
        count: uploadEntries.length,
        entries: uploadEntries,
      },
      null,
      2,
    )}\n`,
  );
  console.log(outPath);
}

main();

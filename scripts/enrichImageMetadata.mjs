import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCosImageSet } from '../lib/cosImage.js';
import { getPublicImageSize, withLocalImageSize } from './imageMetadata.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const itemsPath = path.join(projectRoot, 'public', 'data', 'portfolio-items.json');
const pdfPagesPath = path.join(projectRoot, 'public', 'data', 'pdf-pages.json');
const profilePath = path.join(projectRoot, 'public', 'data', 'profile.json');

function enrichItem(item) {
  const coverSize = getPublicImageSize(projectRoot, item.cover);
  const coverSet = buildCosImageSet(item.cover);
  return {
    ...item,
    ...(coverSet ? { coverSet } : {}),
    ...(coverSize ? { coverWidth: coverSize.width, coverHeight: coverSize.height } : {}),
    ...(item.poster ? withPosterSize(item) : {}),
    assets: item.assets?.map((asset) => withLocalImageSize(projectRoot, asset)) ?? [],
    subgroups:
      item.subgroups?.map((group) => {
        const groupCoverSet = buildCosImageSet(group.cover);
        const groupCoverSize = getPublicImageSize(projectRoot, group.cover);
        return {
          ...group,
          ...(groupCoverSet ? { coverSet: groupCoverSet } : {}),
          ...(groupCoverSize
            ? { coverWidth: groupCoverSize.width, coverHeight: groupCoverSize.height }
            : {}),
          assets: group.assets?.map((asset) => withLocalImageSize(projectRoot, asset)) ?? [],
        };
      }) ?? [],
  };
}

function withPosterSize(item) {
  const posterSize = getPublicImageSize(projectRoot, item.poster);
  return posterSize ? { posterWidth: posterSize.width, posterHeight: posterSize.height } : {};
}

function main() {
  const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8')).map(enrichItem);
  const pdfPages = JSON.parse(fs.readFileSync(pdfPagesPath, 'utf8'));
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));

  for (const [itemId, pages] of Object.entries(pdfPages)) {
    pdfPages[itemId] = pages.map((page) => withLocalImageSize(projectRoot, page));
  }

  const qrSize = getPublicImageSize(projectRoot, profile.wechatQr);
  if (qrSize) {
    profile.wechatQrWidth = qrSize.width;
    profile.wechatQrHeight = qrSize.height;
  }

  fs.writeFileSync(itemsPath, `${JSON.stringify(items, null, 2)}\n`);
  fs.writeFileSync(pdfPagesPath, `${JSON.stringify(pdfPages, null, 2)}\n`);
  fs.writeFileSync(profilePath, `${JSON.stringify(profile, null, 2)}\n`);
  console.log(`Enriched ${items.length} portfolio items with local dimensions and COS srcsets.`);
}

main();

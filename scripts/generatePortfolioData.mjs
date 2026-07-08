import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCosImageSet } from '../lib/cosImage.js';

export const CATEGORIES = [
  '全部作品',
  '商业摄影',
  '影视后期',
  '平面视觉',
  'IP形象设计',
  '影视脚本',
];

export const FEATURED_TITLES = [
  '活动',
  '蘑菇旅行',
  'IP 鼠小仓',
  '风光',
  '数字短片：寻味——顺德牛乳',
  '微电影-乘翼归来',
];

export const MILESTONE_TITLE = '微电影-乘翼归来';

const CATEGORY_ORDER = new Map(
  ['商业摄影', '影视后期', '平面视觉', 'IP形象设计', '影视脚本'].map((name, index) => [
    name,
    index,
  ]),
);

const COMMERCIAL_PROJECT_ORDER = new Map(
  ['活动', '人像', '蔚来 NIO House', '风光', '产品', '人文'].map((title, index) => [
    title,
    index,
  ]),
);

const PREFERRED_COVERS = new Map([
  ['活动', { pathIncludes: ['商业摄影', '活动', '“空中的士”飞行器研学', 'Image936.webp'] }],
  ['蔚来 NIO House', { filename: 'Image1184.webp' }],
  ['风光', { pathIncludes: ['商业摄影', '风光', 'Image19.webp'] }],
]);

const LATE_POST_PRODUCTION_TITLES = [
  '广东省第三届高校防范非法金融活动为视频大赛参赛作品',
  '江西广新 企业拜年',
  '江西广新 企业宣传片',
  '上海普陀房管 老旧房屋改造项目',
  '上海普陀房管 老旧房屋改造项目 2',
  '上海普陀房管 老旧房屋改造项目 3',
];
const LATE_POST_PRODUCTION_ORDER = new Map(
  LATE_POST_PRODUCTION_TITLES.map((title, index) => [title, index]),
);

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'm4v', 'webm']);
const DOCUMENT_EXTENSIONS = new Set(['pdf']);
const SUPPORTED_EXTENSIONS = new Set([
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
  ...DOCUMENT_EXTENSIONS,
]);

const INVALID_FILENAMES = new Set(['.DS_Store', 'sdkconfig']);

function stableId(input) {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

export function parseCsv(csvText) {
  const normalized = csvText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    if (headers.length === 2 && cells.length > 2 && /^https?:\/\//.test(cells.at(-1))) {
      return {
        [headers[0]]: cells.slice(0, -1).join(' '),
        [headers[1]]: cells.at(-1) ?? '',
      };
    }
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
  });
}

function stripQuery(url) {
  return String(url || '').split('?')[0];
}

function decodeCosPath(url) {
  try {
    return new URL(url).pathname
      .split('/')
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
  } catch {
    return [];
  }
}

function getExtension(filename) {
  return path.extname(filename || '').replace('.', '').toLowerCase();
}

function getKind(extension) {
  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (VIDEO_EXTENSIONS.has(extension)) return 'video';
  if (DOCUMENT_EXTENSIONS.has(extension)) return 'pdf';
  return 'other';
}

function isInvalidAsset(filename, decodedPath, extension) {
  if (!filename || INVALID_FILENAMES.has(filename)) return true;
  if (filename.startsWith('.')) return true;
  if (filename.startsWith('ts_')) return true;
  if (decodedPath.some((segment) => segment === '.accelerate')) return true;
  if (!SUPPORTED_EXTENSIONS.has(extension)) return true;
  return false;
}

function detectCategory(decodedPath, filename) {
  const text = `${decodedPath.join('/')} ${filename}`;
  if (/ip|IP|形象|鼠小仓|云上牦牛干/.test(text)) return 'IP形象设计';
  if (decodedPath.includes('商业摄影')) return '商业摄影';
  if (decodedPath.includes('影视后期')) return '影视后期';
  if (decodedPath.includes('平面视觉')) return '平面视觉';
  if (decodedPath.includes('影视脚本')) return '影视脚本';
  return '其他';
}

function normalizeNioTitle(title) {
  if (/蔚来.*NIO\s*House/i.test(title)) return '蔚来 NIO House';
  return title;
}

function normalizeKnownTitle(title) {
  if (/^nomi帽$/i.test(title)) return 'nomi 帽';
  if (title === '小鹿激光') return '小鹿极光';
  if (/助力民航|青春志愿行|我心中的思政课/.test(title)) {
    return MILESTONE_TITLE;
  }
  if (/^寻味[—-]+顺德牛乳$/u.test(title)) return '数字短片：寻味——顺德牛乳';
  return normalizeNioTitle(title);
}

export function cleanTitle(filenameOrFolder) {
  const withoutExtension = filenameOrFolder.replace(/\.[^.]+$/u, '');
  return withoutExtension
    .replace(/^Ip/u, 'IP ')
    .replace(/([^\s])(\d+)$/u, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAssetTitle(title) {
  return normalizeKnownTitle(title);
}

export function cleanAssetRow(row, index = 0) {
  const filename = String(row['文件名'] || row.filename || '').trim();
  const url = stripQuery(row['文件URL'] || row.url);
  const decodedPath = decodeCosPath(url);
  const extension = getExtension(filename);

  if (isInvalidAsset(filename, decodedPath, extension)) return null;

  return {
    id: stableId(`${index}-${decodedPath.join('/')}`),
    filename,
    title: normalizeAssetTitle(cleanTitle(filename)),
    url,
    path: decodedPath,
    extension,
    kind: getKind(extension),
    category: detectCategory(decodedPath, filename),
  };
}

function sortAssets(assets) {
  return [...assets].sort((left, right) =>
    left.path.join('/').localeCompare(right.path.join('/'), 'zh-Hans-CN', {
      numeric: true,
      sensitivity: 'base',
    }),
  );
}

function findPreferredAsset(assets, preference) {
  if (!preference) return null;

  return (
    assets.find((asset) => {
      if (preference.filename && asset.filename.toLowerCase() !== preference.filename.toLowerCase()) {
        return false;
      }
      if (preference.pathIncludes) {
        return preference.pathIncludes.every((segment) => asset.path.includes(segment));
      }
      return true;
    }) ?? null
  );
}

function coverFromAssets(assets, title = '', allAssets = assets) {
  const preference = PREFERRED_COVERS.get(title);
  const cover =
    findPreferredAsset(assets, preference) ??
    findPreferredAsset(allAssets, preference) ??
    assets.find((asset) => asset.kind === 'image') ??
    assets[0];
  return cover?.url ?? '';
}

function addCoverSet(entry) {
  const coverSet = buildCosImageSet(entry.cover);
  return coverSet ? { ...entry, coverSet } : entry;
}

function buildCommercialItems(assets, allAssets = assets) {
  const groups = new Map();

  for (const asset of assets) {
    const categoryIndex = asset.path.indexOf('商业摄影');
    const rawProject = asset.path[categoryIndex + 1] || '商业摄影';
    const projectTitle = normalizeKnownTitle(rawProject);
    const projectKey = stableId(projectTitle);
    const shouldBuildSubgroups = projectTitle === '蔚来 NIO House' || projectTitle === '活动';
    const subgroupName = shouldBuildSubgroups
      ? normalizeKnownTitle(cleanTitle(asset.path[categoryIndex + 2] || ''))
      : '';

    if (!groups.has(projectKey)) {
      groups.set(projectKey, {
        id: `commercial-${projectKey}`,
        title: projectTitle,
        category: '商业摄影',
        description: '',
        type: 'gallery',
        cover: '',
        assets: [],
        subgroups: [],
      });
    }

    const group = groups.get(projectKey);
    group.assets.push(asset);

    if (subgroupName) {
      let subgroup = group.subgroups.find((item) => item.title === subgroupName);
      if (!subgroup) {
        subgroup = {
          id: `${group.id}-${stableId(subgroupName)}`,
          title: subgroupName,
          cover: '',
          assets: [],
        };
        group.subgroups.push(subgroup);
      }
      subgroup.assets.push(asset);
    }
  }

  return [...groups.values()].map((item) => ({
    ...item,
    assets: sortAssets(item.assets),
    subgroups: item.subgroups
      .map((group) => {
        const sortedAssets = sortAssets(group.assets);
        return {
          ...group,
          cover: coverFromAssets(sortedAssets, group.title),
          assets: sortedAssets,
        };
      })
      .map(addCoverSet)
      .sort((left, right) =>
        left.title.localeCompare(right.title, 'zh-Hans-CN', {
          numeric: true,
          sensitivity: 'base',
        }),
      ),
    cover: coverFromAssets(item.assets, item.title, allAssets),
  }));
}

function pickPrimarySingleAsset(assets) {
  return (
    assets.find((asset) => decodeURIComponent(asset.url).includes('我心中的思政课')) ??
    assets[0]
  );
}

function buildSingleFileItems(assets) {
  const groups = new Map();
  for (const asset of assets) {
    const key = `${asset.category}::${asset.title}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(asset);
  }

  return [...groups.values()].map((groupAssets) => {
    const asset = pickPrimarySingleAsset(groupAssets);
    return {
      id: `${stableId(asset.category)}-${stableId(asset.title)}-${asset.id}`,
      title: asset.title,
      category: asset.category,
      description: '',
      type: asset.kind,
      cover: asset.kind === 'image' ? asset.url : '',
      assets: [asset],
      subgroups: [],
    };
  });
}

export function buildPortfolioItems(assets) {
  const usefulAssets = assets.filter((asset) => CATEGORY_ORDER.has(asset.category));
  const commercialItems = buildCommercialItems(
    usefulAssets.filter((asset) => asset.category === '商业摄影'),
    usefulAssets,
  );
  const otherItems = buildSingleFileItems(
    usefulAssets.filter((asset) => asset.category !== '商业摄影'),
  );

  return [...commercialItems, ...otherItems].map(addCoverSet).sort((left, right) => {
    const categoryDelta = CATEGORY_ORDER.get(left.category) - CATEGORY_ORDER.get(right.category);
    if (categoryDelta !== 0) return categoryDelta;

    if (left.category === '影视后期' && right.category === '影视后期') {
      const leftLateOrder = LATE_POST_PRODUCTION_ORDER.get(left.title) ?? -1;
      const rightLateOrder = LATE_POST_PRODUCTION_ORDER.get(right.title) ?? -1;
      const leftIsLate = leftLateOrder >= 0;
      const rightIsLate = rightLateOrder >= 0;

      if (leftIsLate !== rightIsLate) return leftIsLate ? 1 : -1;
      if (leftIsLate && rightIsLate) return leftLateOrder - rightLateOrder;
    }

    if (left.category === '商业摄影' && right.category === '商业摄影') {
      const leftPreferredOrder = COMMERCIAL_PROJECT_ORDER.get(left.title) ?? 999;
      const rightPreferredOrder = COMMERCIAL_PROJECT_ORDER.get(right.title) ?? 999;
      if (leftPreferredOrder !== rightPreferredOrder) return leftPreferredOrder - rightPreferredOrder;
    }

    return left.title.localeCompare(right.title, 'zh-Hans-CN', {
      numeric: true,
      sensitivity: 'base',
    });
  });
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export function generatePortfolioData({
  csvPath,
  supplementalCsvPaths,
  rawAssetsPath,
  portfolioItemsPath,
} = {}) {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const sourceCsv =
    csvPath ?? path.join(rootDir, '04_素材与参考', 'cos-object-list-1783026698139.csv');
  const supplementalSources =
    supplementalCsvPaths ??
    [path.join(rootDir, '04_素材与参考', 'cos-object-list-1783430664310_平面视觉补充.csv')];
  const rawOutput = rawAssetsPath ?? path.join(rootDir, 'public', 'data', 'raw-assets.json');
  const itemsOutput =
    portfolioItemsPath ?? path.join(rootDir, 'public', 'data', 'portfolio-items.json');

  const rows = [sourceCsv, ...supplementalSources]
    .filter((filePath) => fs.existsSync(filePath))
    .flatMap((filePath) => parseCsv(fs.readFileSync(filePath, 'utf8')));
  const assetsByUrl = new Map();
  for (const asset of rows.map(cleanAssetRow).filter(Boolean)) {
    assetsByUrl.set(asset.url, asset);
  }
  const assets = [...assetsByUrl.values()];
  const items = buildPortfolioItems(assets);

  writeJson(rawOutput, assets);
  writeJson(itemsOutput, items);

  return {
    assets,
    items,
    rawOutput,
    itemsOutput,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = generatePortfolioData();
  console.log(`Generated ${result.assets.length} cleaned assets.`);
  console.log(`Generated ${result.items.length} portfolio items.`);
  console.log(result.rawOutput);
  console.log(result.itemsOutput);
}

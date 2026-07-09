import fs from 'node:fs';
import path from 'node:path';
import { withBasePathDeep } from './sitePath';

const projectRoot = process.cwd();
const dataDir = path.join(projectRoot, 'public', 'data');

export const CATEGORY_ORDER = [
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

function readJson(filename) {
  return withBasePathDeep(JSON.parse(fs.readFileSync(path.join(dataDir, filename), 'utf8')));
}

export function getProfile() {
  return readJson('profile.json');
}

export function getPdfPages() {
  return readJson('pdf-pages.json');
}

export function getProjectDetails() {
  return readJson('project-details.json');
}

export function getPortfolioItems() {
  const items = readJson('portfolio-items.json');
  return items.toSorted((a, b) => {
    const categoryDelta =
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    if (categoryDelta !== 0) return categoryDelta;
    return 0;
  });
}

export function getFeaturedItems() {
  const items = getPortfolioItems();
  return FEATURED_TITLES.map((title) => items.find((item) => item.title === title)).filter(Boolean);
}

export function getMilestoneItem() {
  return getPortfolioItems().find((item) => item.title === MILESTONE_TITLE);
}

export function getCategories(items = getPortfolioItems()) {
  const present = new Set(items.map((item) => item.category));
  return CATEGORY_ORDER.filter((category) => category === '全部作品' || present.has(category));
}

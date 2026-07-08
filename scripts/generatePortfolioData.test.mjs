import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  FEATURED_TITLES,
  buildPortfolioItems,
  cleanAssetRow,
  generatePortfolioData,
  parseCsv,
} from './generatePortfolioData.mjs';

const csvPath = path.resolve('04_素材与参考', 'cos-object-list-1783026698139.csv');
const flatVisualSupplementCsvPath = path.resolve(
  '04_素材与参考',
  'cos-object-list-1783430664310_平面视觉补充.csv',
);

describe('portfolio data generator', () => {
  test('parses the new COS csv and strips signed query parameters', () => {
    const csvText = fs.readFileSync(csvPath, 'utf8');
    const rows = parseCsv(csvText);
    const assets = rows.map(cleanAssetRow).filter(Boolean);

    expect(rows.length).toBeGreaterThan(1750);
    expect(assets.length).toBeGreaterThan(1700);
    expect(assets.some((asset) => asset.url.includes('q-signature'))).toBe(false);
    expect(assets.some((asset) => asset.url.includes('x-cos-security-token'))).toBe(false);
  });

  test('recognizes the ideological microfilm as a post-production video', () => {
    const csvText = fs.readFileSync(csvPath, 'utf8');
    const rows = parseCsv(csvText);
    const assets = rows.map(cleanAssetRow).filter(Boolean);
    const item = buildPortfolioItems(assets).find((entry) => entry.title === '微电影-乘翼归来');

    expect(item).toBeTruthy();
    expect(item.category).toBe('影视后期');
    expect(item.type).toBe('video');
    expect(item.assets[0].url).toContain(
      '%E6%88%91%E5%BF%83%E4%B8%AD%E7%9A%84%E6%80%9D%E6%94%BF%E8%AF%BE',
    );
  });

  test('keeps all manually selected featured titles available in generated items', () => {
    const { items } = generatePortfolioData({
      csvPath,
      rawAssetsPath: path.resolve('tmp', 'test-raw-assets.json'),
      portfolioItemsPath: path.resolve('tmp', 'test-portfolio-items.json'),
    });
    const titles = new Set(items.map((item) => item.title));

    for (const title of FEATURED_TITLES) {
      expect(titles.has(title)).toBe(true);
    }
  });

  test('keeps NIO subgroups and yak jerky IP classification from the old site rules', () => {
    const csvText = fs.readFileSync(csvPath, 'utf8');
    const rows = parseCsv(csvText);
    const items = buildPortfolioItems(rows.map(cleanAssetRow).filter(Boolean));
    const nio = items.find((item) => item.title === '蔚来 NIO House');
    const yak = items.find((item) => item.title === '云上牦牛干');

    expect(nio?.subgroups.length).toBeGreaterThan(1);
    expect(nio?.subgroups.every((group) => group.title && group.cover)).toBe(true);
    expect(yak?.category).toBe('IP形象设计');
  });

  test('keeps commercial activity folders as subprojects', () => {
    const csvText = fs.readFileSync(csvPath, 'utf8');
    const rows = parseCsv(csvText);
    const items = buildPortfolioItems(rows.map(cleanAssetRow).filter(Boolean));
    const activity = items.find((item) => item.title === '活动');

    expect(activity?.subgroups.length).toBeGreaterThan(10);
    expect(activity?.subgroups.some((group) => group.title === '地铁站小小志愿者')).toBe(true);
    expect(activity?.subgroups.every((group) => group.assets.length > 0 && group.cover)).toBe(true);
    expect(activity?.subgroups.every((group) => group.coverSet?.['520'] || group.coverSet?.['720'])).toBe(true);
    expect(activity?.cover).toContain('Image936.webp');
    expect(activity?.coverSet?.['720']).toContain('imageMogr2/thumbnail/720x/format/webp');
  });

  test('orders commercial photography by portfolio value priority', () => {
    const csvText = fs.readFileSync(csvPath, 'utf8');
    const rows = parseCsv(csvText);
    const commercialTitles = buildPortfolioItems(rows.map(cleanAssetRow).filter(Boolean))
      .filter((item) => item.category === '商业摄影')
      .map((item) => item.title);

    expect(commercialTitles.slice(0, 6)).toEqual([
      '活动',
      '人像',
      '蔚来 NIO House',
      '风光',
      '产品',
      '人文',
    ]);
  });

  test('merges the supplemental flat visual csv without duplicating existing PDF work', () => {
    const { items } = generatePortfolioData({
      csvPath,
      supplementalCsvPaths: [flatVisualSupplementCsvPath],
      rawAssetsPath: path.resolve('tmp', 'test-raw-assets.json'),
      portfolioItemsPath: path.resolve('tmp', 'test-portfolio-items.json'),
    });
    const flatVisualTitles = items
      .filter((item) => item.category === '平面视觉')
      .map((item) => item.title);

    expect(flatVisualTitles).toContain('Xiao cang');
    expect(flatVisualTitles).toContain('一叶子');
    expect(flatVisualTitles).toContain('小鹿极光');
    expect(flatVisualTitles).toContain('科技梦想');
    expect(flatVisualTitles.filter((title) => title === '蘑菇旅行')).toHaveLength(1);
  });
});

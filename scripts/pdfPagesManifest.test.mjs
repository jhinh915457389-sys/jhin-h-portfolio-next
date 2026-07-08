import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

describe('pdf pages manifest', () => {
  test('contains rendered image pages for every generated PDF item', () => {
    const itemsPath = path.resolve('public', 'data', 'portfolio-items.json');
    const manifestPath = path.resolve('public', 'data', 'pdf-pages.json');
    if (!fs.existsSync(itemsPath) || !fs.existsSync(manifestPath)) return;

    const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const pdfItems = items.filter((item) => item.type === 'pdf');

    expect(pdfItems.length).toBeGreaterThan(0);
    for (const item of pdfItems) {
      expect(manifest[item.id]?.length).toBeGreaterThan(0);
      expect(manifest[item.id][0].kind).toBe('image');
    }
  });
});

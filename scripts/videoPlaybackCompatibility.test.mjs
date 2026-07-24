import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portfolioBrowser = fs.readFileSync(path.join(projectRoot, 'components', 'PortfolioBrowser.jsx'), 'utf8');

describe('video playback compatibility', () => {
  test('provides a new-tab fallback after a video playback error', () => {
    expect(portfolioBrowser).toContain('videoPlaybackFailed');
    expect(portfolioBrowser).toContain('onError={handleVideoError}');
    expect(portfolioBrowser).toContain('target="_blank"');
    expect(portfolioBrowser).toContain('在新标签打开视频');
  });
});

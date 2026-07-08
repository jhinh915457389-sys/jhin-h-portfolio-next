import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const BASE_URL = process.env.PORTFOLIO_CHECK_URL || 'http://127.0.0.1:4174';
const OUT_DIR = path.resolve('03_交付成果/previews');

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canConnect(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(response.statusCode < 500);
    });
    request.on('error', () => resolve(false));
    request.setTimeout(1200, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function ensureServer() {
  if (await canConnect(BASE_URL)) return null;

  const server = spawn('pnpm', ['dev', '--hostname', '127.0.0.1', '--port', '4174'], {
    stdio: 'pipe',
    shell: true,
  });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await canConnect(BASE_URL)) return server;
    await wait(500);
  }

  server.kill();
  throw new Error(`Cannot start dev server at ${BASE_URL}`);
}

async function waitForImages(page, selector, minLoaded = 1) {
  await page.waitForFunction(({ targetSelector, requiredCount }) => {
    const images = [...document.querySelectorAll(targetSelector)];
    const loadedImages = images.filter((image) => image.complete && image.naturalWidth > 0);
    return images.length >= requiredCount && loadedImages.length >= requiredCount;
  }, { targetSelector: selector, requiredCount: minLoaded });
}

function recordFailure(failures, label, details = {}) {
  failures.push({ label, details });
}

function nearlyEqual(actual, expected, tolerance = 1) {
  return Math.abs(actual - expected) <= tolerance;
}

function parseAlpha(color) {
  const rgbaMatch = color.match(/rgba?\(([^)]+)\)/);
  if (!rgbaMatch) return 1;
  const parts = rgbaMatch[1].split(',').map((part) => part.trim());
  if (parts.length < 4) return 1;
  const alpha = Number(parts[3]);
  return Number.isFinite(alpha) ? alpha : 1;
}

async function assertNoHorizontalOverflow(page, label, failures) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  if (metrics.scrollWidth > metrics.clientWidth + 1) recordFailure(failures, label, metrics);
}

async function assertNoCountText(page, selector, label, failures) {
  const text = await page.locator(selector).evaluateAll((nodes) => nodes.map((node) => node.textContent ?? '').join(' '));
  if (/\d+\s*张/.test(text)) recordFailure(failures, label, { text });
}

async function assertContactQrSquare(page, failures) {
  const qr = await page.locator('.wechat-qr').first();
  await qr.waitFor({ state: 'visible', timeout: 3000 });
  const metrics = await qr.evaluate((image) => {
    const rect = image.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    };
  });
  const renderedRatio = metrics.width / metrics.height;
  const naturalRatio = metrics.naturalWidth / metrics.naturalHeight;
  if (Math.abs(renderedRatio - 1) > 0.01 || Math.abs(naturalRatio - 1) > 0.01) {
    recordFailure(failures, 'contact QR must render square on responsive layouts', metrics);
  }
}

async function assertMobileDrawerAnchored(page, label, failures) {
  const metrics = await page.evaluate(() => {
    const drawer = document.querySelector('.work-drawer');
    const topbar = document.querySelector('.drawer-topbar');
    if (!drawer || !topbar) return null;
    const drawerRect = drawer.getBoundingClientRect();
    const topbarRect = topbar.getBoundingClientRect();
    const drawerStyle = window.getComputedStyle(drawer);
    const topbarStyle = window.getComputedStyle(topbar);
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      drawerTop: drawerRect.top,
      drawerLeft: drawerRect.left,
      drawerWidth: drawerRect.width,
      drawerHeight: drawerRect.height,
      drawerPaddingTop: drawerStyle.paddingTop,
      drawerBackgroundColor: drawerStyle.backgroundColor,
      drawerBackgroundAlpha: parseFloat(drawerStyle.backgroundColor.match(/rgba?\((?:[^,]+,\s*){3}([^)]+)\)/)?.[1] ?? '1'),
      topbarTop: topbarRect.top,
      topbarLeft: topbarRect.left,
      topbarWidth: topbarRect.width,
      topbarPosition: topbarStyle.position,
      topbarBackgroundAlpha: parseFloat(topbarStyle.backgroundColor.match(/rgba?\((?:[^,]+,\s*){3}([^)]+)\)/)?.[1] ?? '1'),
    };
  });
  if (!metrics) {
    recordFailure(failures, `${label}: drawer/topbar missing`);
    return;
  }
  if (!nearlyEqual(metrics.drawerTop, 0, 1)) recordFailure(failures, `${label}: drawer must be flush with viewport top`, metrics);
  if (!nearlyEqual(metrics.topbarTop, 0, 1)) recordFailure(failures, `${label}: drawer topbar must be flush with viewport top`, metrics);
  if (metrics.drawerPaddingTop !== '0px') recordFailure(failures, `${label}: drawer must not reserve top padding on mobile`, metrics);
  if (metrics.drawerBackgroundAlpha < 0.95) recordFailure(failures, `${label}: drawer background must not reveal underlying page`, metrics);
  if (!nearlyEqual(metrics.topbarLeft, metrics.drawerLeft, 1) || metrics.topbarWidth < metrics.drawerWidth - 2) {
    recordFailure(failures, `${label}: drawer topbar must span drawer width`, metrics);
  }
  if (metrics.topbarPosition !== 'sticky') recordFailure(failures, `${label}: drawer topbar must remain sticky while scrolling`, metrics);
}

async function assertSubgalleryAnchored(page, label, failures) {
  const metrics = await page.evaluate(() => {
    const layer = document.querySelector('.subgallery-layer');
    const panel = document.querySelector('.subgallery-panel');
    const head = document.querySelector('.subgallery-head');
    if (!layer || !panel || !head) return null;
    const layerRect = layer.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const headRect = head.getBoundingClientRect();
    const panelStyle = window.getComputedStyle(panel);
    const headStyle = window.getComputedStyle(head);
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      layerTop: layerRect.top,
      panelTop: panelRect.top,
      panelHeight: panelRect.height,
      panelRadius: panelStyle.borderTopLeftRadius,
      headTop: headRect.top,
      headPosition: headStyle.position,
      headBackgroundAlpha: parseFloat(headStyle.backgroundColor.match(/rgba?\((?:[^,]+,\s*){3}([^)]+)\)/)?.[1] ?? '1'),
    };
  });
  if (!metrics) {
    recordFailure(failures, `${label}: subgallery layer/panel missing`);
    return;
  }
  if (!nearlyEqual(metrics.layerTop, 0, 1) || !nearlyEqual(metrics.panelTop, 0, 1)) {
    recordFailure(failures, `${label}: subgallery panel must be flush with viewport top`, metrics);
  }
  if (!nearlyEqual(metrics.panelHeight, metrics.viewportHeight, 2)) {
    recordFailure(failures, `${label}: subgallery panel must occupy full viewport height`, metrics);
  }
  if (metrics.panelRadius !== '0px') recordFailure(failures, `${label}: mobile subgallery must not use floating rounded sheet`, metrics);
  if (!nearlyEqual(metrics.headTop, 0, 1)) recordFailure(failures, `${label}: subgallery header must stay at viewport top`, metrics);
  if (metrics.headPosition !== 'sticky') recordFailure(failures, `${label}: subgallery header must be sticky`, metrics);
  if (metrics.headBackgroundAlpha < 0.95) recordFailure(failures, `${label}: subgallery header must hide underlying page`, metrics);
}

async function assertSubgalleryHeaderCopy(page, failures) {
  const text = await page.locator('.subgallery-head p').first().textContent();
  const normalized = text?.trim();
  if (normalized !== '点击后可完整比例查看并左右切换。') {
    recordFailure(failures, 'subgallery helper copy must not include image count', { text: normalized });
  }
}

async function assertDrawerOpenStability(page, failures) {
  await page.goto(`${BASE_URL}/portfolio`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.work-card');
  const before = await getCardDocumentRects(page);
  await page.locator('.work-card').first().click();
  await page.waitForSelector('.work-drawer');
  await page.waitForTimeout(80);
  const during = await getCardDocumentRects(page);
  await page.waitForTimeout(420);
  const after = await getCardDocumentRects(page);
  const maxDuringDrift = maxRectDrift(before, during);
  const maxAfterDrift = maxRectDrift(before, after);
  if (maxDuringDrift > 1 || maxAfterDrift > 1) {
    recordFailure(failures, 'opening drawer must not shift underlying portfolio cards', {
      maxDuringDrift,
      maxAfterDrift,
      before,
      during,
      after,
    });
  }
}

async function getCardDocumentRects(page) {
  return page.locator('.work-card').evaluateAll((cards) => cards.slice(0, 8).map((card) => {
    const rect = card.getBoundingClientRect();
    return {
      left: rect.left + window.scrollX,
      top: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    };
  }));
}

function maxRectDrift(before, after) {
  return before.reduce((max, rect, index) => {
    const next = after[index];
    if (!next) return max;
    return Math.max(
      max,
      Math.abs(rect.left - next.left),
      Math.abs(rect.top - next.top),
      Math.abs(rect.width - next.width),
      Math.abs(rect.height - next.height),
    );
  }, 0);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await ensureServer();
  const browser = await launchBrowser();
  const errors = [];
  const failures = [];

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  desktop.on('console', (message) => {
    if (message.type() === 'error') errors.push(`desktop: ${message.text()}`);
  });
  desktop.on('pageerror', (error) => errors.push(`desktop: ${error.message}`));

  await desktop.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await assertContactQrSquare(desktop, failures);
  await assertNoHorizontalOverflow(desktop, 'desktop home must not overflow horizontally', failures);
  await desktop.screenshot({ path: path.join(OUT_DIR, 'home-desktop.png'), fullPage: true });

  await desktop.goto(`${BASE_URL}/portfolio`, { waitUntil: 'networkidle' });
  await assertNoHorizontalOverflow(desktop, 'desktop portfolio must not overflow horizontally', failures);
  await desktop.screenshot({ path: path.join(OUT_DIR, 'portfolio-desktop.png'), fullPage: true });

  await assertDrawerOpenStability(desktop, failures);
  await desktop.goto(`${BASE_URL}/portfolio`, { waitUntil: 'networkidle' });
  await desktop.locator('.work-card').first().click();
  await desktop.waitForSelector('.work-drawer');
  await desktop.waitForTimeout(350);
  await desktop.screenshot({ path: path.join(OUT_DIR, 'portfolio-drawer-desktop.png'), fullPage: false });

  const galleryButton = desktop.locator('.drawer-gallery button, .subproject-grid button').first();
  if (await galleryButton.count()) {
    await galleryButton.click();
    const lightboxVisible = await desktop.locator('.lightbox img').first().waitFor({ timeout: 3000 }).then(
      () => true,
      () => false,
    );
    if (lightboxVisible) {
      await desktop.screenshot({ path: path.join(OUT_DIR, 'portfolio-lightbox-desktop.png'), fullPage: false });
    }
  }

  await desktop.goto(`${BASE_URL}/portfolio`, { waitUntil: 'networkidle' });
  await desktop.locator('.work-card').filter({ hasText: /活动/ }).first().click();
  await desktop.waitForSelector('.subproject-grid button');
  await waitForImages(desktop, '.subproject-grid button img', 6);
  await assertNoCountText(desktop, '.subproject-meta', 'commercial subproject cards must not show image counts', failures);
  await desktop.waitForTimeout(350);
  await desktop.screenshot({ path: path.join(OUT_DIR, 'portfolio-activity-subprojects-desktop.png'), fullPage: false });
  await desktop.locator('.subproject-grid button').nth(2).click();
  await desktop.waitForSelector('.subgallery-panel');
  await waitForImages(desktop, '.subgallery-grid button img', 8);
  await assertSubgalleryHeaderCopy(desktop, failures);
  await assertNoCountText(desktop, '.subgallery-head p', 'subgallery header copy must not show image counts', failures);
  await desktop.screenshot({ path: path.join(OUT_DIR, 'portfolio-activity-subgallery-desktop.png'), fullPage: false });
  await desktop.locator('.subgallery-grid button').first().click();
  await desktop.waitForSelector('.lightbox img');
  await desktop.screenshot({ path: path.join(OUT_DIR, 'portfolio-activity-lightbox-desktop.png'), fullPage: false });

  await desktop.goto(`${BASE_URL}/portfolio`, { waitUntil: 'networkidle' });
  await desktop.locator('.filter-bar button').filter({ hasText: /^平面视觉$/ }).click();
  await desktop.locator('.work-card').filter({ hasText: /蘑菇旅行/ }).first().click();
  await desktop.waitForSelector('.pdf-reader img');
  await desktop.waitForTimeout(350);
  await desktop.screenshot({ path: path.join(OUT_DIR, 'portfolio-pdf-desktop.png'), fullPage: false });

  await desktop.goto(`${BASE_URL}/portfolio`, { waitUntil: 'networkidle' });
  await desktop.locator('.filter-bar button').filter({ hasText: /^影视后期$/ }).click();
  await desktop.locator('.work-card').first().click();
  await desktop.waitForSelector('video');
  await desktop.waitForTimeout(350);
  await desktop.screenshot({ path: path.join(OUT_DIR, 'portfolio-video-desktop.png'), fullPage: false });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  mobile.on('console', (message) => {
    if (message.type() === 'error') errors.push(`mobile: ${message.text()}`);
  });
  mobile.on('pageerror', (error) => errors.push(`mobile: ${error.message}`));

  await mobile.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await assertContactQrSquare(mobile, failures);
  await assertNoHorizontalOverflow(mobile, 'mobile home must not overflow horizontally', failures);
  await mobile.screenshot({ path: path.join(OUT_DIR, 'home-mobile.png'), fullPage: true });

  await mobile.goto(`${BASE_URL}/portfolio`, { waitUntil: 'networkidle' });
  await assertNoHorizontalOverflow(mobile, 'mobile portfolio must not overflow horizontally before opening drawer', failures);
  await mobile.screenshot({ path: path.join(OUT_DIR, 'portfolio-mobile.png'), fullPage: true });

  await mobile.locator('.work-card').first().click();
  await mobile.waitForSelector('.work-drawer');
  await mobile.waitForTimeout(350);
  await assertMobileDrawerAnchored(mobile, '390px mobile drawer', failures);
  await assertNoHorizontalOverflow(mobile, 'mobile drawer must not overflow horizontally', failures);
  await mobile.screenshot({ path: path.join(OUT_DIR, 'portfolio-drawer-mobile.png'), fullPage: false });

  const narrow = await browser.newPage({ viewport: { width: 721, height: 735 }, isMobile: true });
  narrow.on('console', (message) => {
    if (message.type() === 'error') errors.push(`narrow: ${message.text()}`);
  });
  narrow.on('pageerror', (error) => errors.push(`narrow: ${error.message}`));

  await narrow.goto(`${BASE_URL}/portfolio`, { waitUntil: 'networkidle' });
  await narrow.locator('.work-card').filter({ hasText: /活动/ }).first().click();
  await narrow.waitForSelector('.work-drawer');
  await narrow.waitForTimeout(350);
  await assertMobileDrawerAnchored(narrow, '721px narrow drawer', failures);
  await assertNoCountText(narrow, '.subproject-meta', 'narrow commercial subproject cards must not show image counts', failures);
  await narrow.locator('.subproject-grid button').first().click();
  await narrow.waitForSelector('.subgallery-panel');
  await waitForImages(narrow, '.subgallery-grid button img', 4);
  await assertSubgalleryAnchored(narrow, '721px narrow subgallery', failures);
  await assertSubgalleryHeaderCopy(narrow, failures);
  await assertNoHorizontalOverflow(narrow, 'narrow subgallery must not overflow horizontally', failures);
  await narrow.screenshot({ path: path.join(OUT_DIR, 'portfolio-subgallery-narrow.png'), fullPage: false });

  await browser.close();
  if (server) server.kill();

  if (errors.length || failures.length) {
    throw new Error(
      JSON.stringify(
        {
          errors,
          failures,
        },
        null,
        2,
      ),
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        screenshots: fs.readdirSync(OUT_DIR).filter((file) => file.endsWith('.png')).sort(),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome' });
  } catch {
    return chromium.launch();
  }
}

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)(process.env.MINDFLOW_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const url = pathToFileURL(path.resolve('tests/ui-preview/index.html')).href;
  await page.goto(url);
  const image = page.locator('details').filter({ has: page.locator('summary', { hasText: '节点图片' }) });
  const link = page.locator('details').filter({ has: page.locator('summary', { hasText: '关联导图主题' }) });
  assert.equal(await image.getAttribute('open'), null);
  assert.equal(await link.getAttribute('open'), null);
  const summary = image.locator('summary');
  await summary.focus();
  await page.keyboard.press('Space');
  assert.notEqual(await image.getAttribute('open'), null);
  await image.getByRole('button', { name: '导入图片', exact: true }).waitFor();
  await page.keyboard.press('Space');
  assert.equal(await image.getAttribute('open'), null);
  for (const dark of [false, true]) {
    await page.goto(`${url}?linked&image${dark ? '&dark' : ''}`);
    await image.locator('img').waitFor();
    assert.notEqual(await image.getAttribute('open'), null);
    assert.notEqual(await link.getAttribute('open'), null);
    await page.setViewportSize({ width: 420, height: 350 });
    const header = await page.locator('.mindflow-inspector > div').first().boundingBox();
    assert.ok(Math.abs(header.height - 48) < 1, JSON.stringify(header));
    const body = page.locator('.mindflow-inspector > div').nth(1);
    await body.evaluate(el => { el.scrollTop = el.scrollHeight; });
    const after = await page.locator('.mindflow-inspector > div').first().boundingBox();
    assert.equal(after.y, header.y);
  }
  console.log('PASS: optional sections, Space toggling, existing content visibility, and stable short-window inspector headers in both themes.');
} finally { await browser.close(); }

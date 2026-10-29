import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = createRequire(import.meta.url)(process.env.MINDFLOW_PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 360, height: 280 } });
  await page.goto(pathToFileURL(fileURLToPath(new URL('../tests/menu-fixture/index.html', import.meta.url))).href);
  for (const kind of ['node', 'canvas']) {
    const launcher = page.locator(`#${kind}-launcher`);
    await launcher.click();
    const menu = page.getByRole('menu');
    const items = menu.getByRole('menuitem');
    await items.first().waitFor();
    assert.equal(await items.first().evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('End');
    assert.equal(await items.last().evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowUp');
    assert.equal(await items.last().evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('ArrowDown');
    assert.equal(await items.first().evaluate(el => el === document.activeElement), true);
    const rect = await menu.boundingBox();
    assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 360 && rect.y + rect.height <= 280, JSON.stringify(rect));
    await page.keyboard.press('Escape');
    assert.equal(await menu.count(), 0);
    assert.equal(await launcher.evaluate(el => el === document.activeElement), true);
    assert.equal(await page.locator('#action-count').textContent(), kind === 'node' ? '0' : '1');
    await launcher.click();
    await page.keyboard.press('Enter');
    assert.equal(await menu.count(), 0);
    assert.equal(await page.locator('#action-count').textContent(), kind === 'node' ? '1' : '2');
    await launcher.click();
    await page.setViewportSize({ width: 240, height: 200 });
    await page.waitForFunction(() => {
      const box = document.querySelector('[role="menu"]').getBoundingClientRect();
      return box.x >= 0 && box.y >= 0 && box.right <= innerWidth && box.bottom <= innerHeight;
    });
    const resized = await menu.boundingBox();
    assert.ok(resized.x >= 0 && resized.y >= 0 && resized.x + resized.width <= 240 && resized.y + resized.height <= 200);
    await page.keyboard.press('Tab');
    assert.equal(await menu.count(), 0);
    assert.equal(await page.locator('#action-count').textContent(), kind === 'node' ? '1' : '2');
    await page.setViewportSize({ width: 360, height: 280 });
  }
  console.log('PASS: both real React menus preserve focus, wrap keyboard navigation, dismiss, activate once, and fit a 360×280 viewport.');
} finally { await browser.close(); }

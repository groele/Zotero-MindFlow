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
  assert.equal(await page.locator('button[title^="模版库"]').count(), 0);
  assert.equal(await page.locator('button[title="导入与导出"]').count(), 0);
  await page.getByRole('button', { name: '更多操作', exact: true }).click();
  await page.getByRole('menuitem', { name: '模板库', exact: true }).waitFor();
  await page.getByRole('menuitem', { name: '演示导图', exact: true }).waitFor();
  assert.equal(await page.getByRole('menuitem', { name: /JSON 工程备份/ }).count(), 0);
  await page.getByRole('menuitem', { name: '导出文件…', exact: true }).click();
  await page.getByRole('menuitem', { name: /JSON 工程备份/ }).waitFor();
  assert.equal(await page.getByRole('menuitem', { name: /打印.*PDF/ }).count(), 0);
  await page.keyboard.press('End');
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('menu').count(), 0);
  assert.equal(await page.locator('[data-mindflow-popup-trigger="more"]').evaluate(el => el === document.activeElement), true);
  await page.locator('[data-mindflow-popup-trigger="layout"]').click();
  await page.locator('[data-mindflow-popup-trigger="theme"]').click();
  assert.equal(await page.getByRole('menu').count(), 1);
  assert.equal(await page.locator('[data-mindflow-popup="layout"]').count(), 0);
  await page.getByRole('textbox', { name: '思维导图标题', exact: true }).click();
  assert.equal(await page.getByRole('menu').count(), 0);
  for (const mode of ['toolbar', 'hidden']) {
    await page.goto(`${url}?templates=${mode}&presentation=${mode}&export=${mode}`);
    await page.locator('header').waitFor();
    assert.equal(await page.locator('button[title^="模版库"]').count(), mode === 'toolbar' ? 1 : 0);
    assert.equal(await page.locator('button[title="导入与导出"]').count(), mode === 'toolbar' ? 1 : 0);
    await page.getByRole('button', { name: '更多操作', exact: true }).click();
    assert.equal(await page.getByRole('menuitem', { name: '模板库', exact: true }).count(), 0);
    assert.equal(await page.getByRole('menuitem', { name: '演示导图', exact: true }).count(), 0);
  }
  for (const legacy of [false, true]) {
    if (legacy && !process.env.MINDFLOW_LEGACY_CSS) continue;
    if (legacy) await page.route('**/mindflow.css', route => route.fulfill({ path: process.env.MINDFLOW_LEGACY_CSS, contentType: 'text/css' }));
    for (const width of [1876, 1200, 600]) {
      await page.setViewportSize({ width, height: 960 });
      await page.goto(url);
      await page.locator('header').waitFor();
      const geometry = await page.locator('header').evaluate(header => ({
        height: header.getBoundingClientRect().height,
        groups: [...header.children].map(child => child.getBoundingClientRect().toJSON()),
      }));
      assert.ok(geometry.height < (width >= 1200 ? 120 : 200), JSON.stringify({ legacy, width, geometry }));
      for (const box of geometry.groups.filter(box => box.width && box.height)) assert.ok(box.left >= -1 && box.right <= width + 1, JSON.stringify({ legacy, width, box }));
    }
  }
  console.log('PASS: toolbar placement modes, popup exclusion, dismissal and focus restoration.');
} finally { await browser.close(); }

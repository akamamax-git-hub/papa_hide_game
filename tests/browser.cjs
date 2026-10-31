const { chromium } = require('playwright');
const fs = require('node:fs');
let browser;
const assert = require('node:assert/strict');

(async () => {
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8000', { waitUntil: 'load' });
  await page.locator('#startBtn').click();
  assert.equal(await page.locator('.stage-card').count(), 50);
  const stages = JSON.parse(fs.readFileSync('scenario/Stage01-50_シナリオ企画表.json', 'utf8'));
  const selected = process.env.STAGES ? process.env.STAGES.split(',').map(Number) : stages.map(s => s.stage);
  const results = [];
  for (const n of selected) {
    const s = stages.find(s => s.stage === n);
    await page.evaluate(n => GameTest.loadStage(n), n);
    for (let i = 0; i < s.solution.length; i++) {
      const button = page.locator('[data-role="correct"]').filter({ hasText: s.solution[i] });
      await button.waitFor();
      await button.click();
      await page.waitForFunction(step => GameTest.getState().step === step, i + 1);
    }
    await page.locator('.result-card h2').filter({ hasText: 'CLEAR!' }).waitFor();
    assert.equal(await page.evaluate(() => GameTest.getState().status), 'CLEAR');
    await page.evaluate(n => GameTest.loadStage(n), n);
    await page.locator('[data-role="fail"]').click();
    await page.locator('.result-card.fail').waitFor();
    assert.equal(await page.evaluate(() => GameTest.getState().status), 'FAILED');
    await page.locator('#resRetry').click();
    assert.deepEqual(await page.evaluate(() => [GameTest.getState().step, GameTest.getState().status]), [0, 'PLAYING']);
    assert.equal(await page.locator('.overlay').count(), 0);
    results.push({ stage: n, clear: 'PASS', fail: 'PASS', retry: 'PASS' });
    console.log(`Stage ${n}: CLEAR / FAILED / Retry PASS`);
  }
  assert.deepEqual(errors, [], 'Browser JavaScript errors');
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync(process.env.RESULT || 'test-results/regression.json', JSON.stringify({ results, errors }, null, 2));
  await browser.close();
})().catch(async e => { console.error(e); await browser?.close(); process.exitCode = 1; });

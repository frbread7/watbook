const { test, expect } = require('@playwright/test');

test('home, full chapter index, and original cover render without browser errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expect(page.locator('h1')).toContainText(/wafer measurements|웨이퍼 측정/i);
  await expect(page.locator('.chapter-card')).toHaveCount(10);
  await expect(page.locator('.hero-art')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open the interactive lab', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  expect(errors).toEqual([]);
});

test('English/Korean chapter navigation and project-site links work', async ({ page }) => {
  await page.goto('./');
  await page.locator('.chapter-card').first().click();
  await expect(page.locator('h1')).toContainText(/measurement-to-decision/i);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /https:\/\/frbread7\.github\.io\/watbook\/chapters\//);
  await page.getByRole('link', { name: '한국어' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page.locator('h1')).toContainText('측정에서 의사결정까지');
  await page.getByRole('link', { name: '책 홈', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page.locator('.chapter-card')).toHaveCount(10);
  expect(new URL(page.url()).pathname.startsWith('/watbook/ko/')).toBeTruthy();
});

test('chapter comparison tables stay inside the page and have keyboard-scrollable regions', async ({ page }) => {
  for (const chapter of ['c04-extraction-contract', 'c07-electrical-signatures']) {
    await page.goto(`./chapters/${chapter}.html`);
    await expect(page.locator('.table-scroll table')).toBeVisible();
    await expect(page.locator('.table-scroll')).toHaveAttribute('role', 'region');
    await expect(page.locator('.table-scroll')).toHaveAttribute('tabindex', '0');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
    if (page.viewportSize().width <= 400) {
      expect(await page.locator('.table-scroll').evaluate(node => node.scrollWidth > node.clientWidth)).toBeTruthy();
    }
  }
});

test('license page explains project terms in both languages and links to complete notices', async ({ page }) => {
  await page.goto('./license.html');
  await expect(page.locator('h1')).toHaveText('License and attribution');
  await expect(page.getByRole('link', { name: 'LICENSE-MIT' })).toHaveAttribute('href', 'LICENSE-MIT');
  await page.getByRole('link', { name: '한국어' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page.locator('h1')).toHaveText('라이선스 및 저작자 표시');
  await expect(page.getByRole('link', { name: 'LICENSE-MIT' })).toHaveAttribute('href', '../LICENSE-MIT');
});

test('all six lab interactions produce bounded readable output', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./lab.html');
  await page.getByLabel(/MOS structure|MOS 구조/).check();
  await page.getByRole('button', { name: /check named coverage|측정량 커버리지 확인/i }).click();
  await expect(page.locator('#monitor-output')).toContainText(/covered|다룹니다/);
  await page.getByRole('button', { name: /calculate|계산/i }).first().click();
  await expect(page.locator('#extract-output')).toContainText(/mV/);
  await page.getByRole('button', { name: /combine|결합 계산/i }).click();
  await expect(page.locator('#uncertainty-output')).toContainText(/5\.385/);
  await page.getByRole('button', { name: /generate 7|7 × 7/i }).click();
  await expect(page.locator('#map-grid .map-cell')).toHaveCount(29);
  await page.getByRole('button', { name: /calculate pooled|합동·로트 내/i }).click();
  await expect(page.locator('#association-output')).toContainText(/within-lot slope|로트 내 기울기/);
  await page.getByLabel(/channel after|채널을 따라가는/).check();
  await page.getByRole('button', { name: /rank hypotheses|가설 순위/i }).click();
  await expect(page.locator('#diagnosis-output')).toContainText(/ordinal score|순위 점수/);
  expect(await page.locator('#main').evaluate(node => node.innerText)).not.toMatch(/NaN|Infinity/);
  expect(errors).toEqual([]);
});

test('wafer map exposes its site count and a bilingual table text equivalent', async ({ page }) => {
  await page.goto('./lab.html');
  await expect(page.locator('#map-grid .map-cell')).toHaveCount(29);
  await expect(page.locator('#map-grid')).toHaveAttribute('aria-label', /29 sites \(n=29\)/);
  await expect(page.locator('#map-output')).toContainText(/29 sites \(n=29\)/);
  await expect(page.locator('#map-data-summary')).toContainText('n=29');
  await expect(page.locator('#map-data-rows tr')).toHaveCount(29);
  await page.locator('#map-data-summary').click();
  await expect(page.locator('.map-data table')).toBeVisible();
  await expect(page.locator('.map-data thead')).toContainText(/Lot effect.*Wafer effect.*Radial term.*Process value.*Channel offset.*Order drift.*Noise.*Measured value/s);
  const englishDataRegion = page.locator('.map-data .table-scroll');
  await expect(englishDataRegion).toHaveAttribute('role', 'region');
  await expect(englishDataRegion).toHaveAttribute('tabindex', '0');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
  if (page.viewportSize().width <= 400) {
    expect(await englishDataRegion.evaluate(node => node.scrollWidth > node.clientWidth)).toBeTruthy();
    await englishDataRegion.focus();
    await expect(englishDataRegion).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => englishDataRegion.evaluate(node => node.scrollLeft), { timeout: 1_000 }).toBeGreaterThan(0);
  } else {
    await englishDataRegion.focus();
    await expect(englishDataRegion).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect.poll(() => englishDataRegion.evaluate(node => node.scrollLeft), { timeout: 1_000 }).toBeGreaterThan(0);
  }

  await page.getByRole('link', { name: '한국어' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
  await expect(page.locator('#map-grid .map-cell')).toHaveCount(29);
  await expect(page.locator('#map-grid')).toHaveAttribute('aria-label', /n=29 \(29개 사이트\)/);
  await expect(page.locator('#map-data-summary')).toContainText('n=29');
  await expect(page.locator('#map-data-rows tr')).toHaveCount(29);
  await page.locator('#map-data-summary').click();
  await expect(page.locator('.map-data thead')).toContainText(/로트 효과.*웨이퍼 효과.*방사형 항.*공정값.*채널 오프셋.*순서 드리프트.*노이즈.*측정값/s);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});

test('a reference moving with the suspect channel ranks the channel hypothesis first', async ({ page }) => {
  await page.goto('./lab.html');
  await page.getByLabel(/stable reference also shifts|안정 기준 구조도 함께 이동/i).check();
  await page.getByRole('button', { name: /rank hypotheses|가설 순위/i }).click();
  const output = await page.locator('#diagnosis-output').innerText();
  expect(output.indexOf('test-channel effect: ordinal score 1')).toBeLessThan(output.indexOf('process spatial pattern: ordinal score -1'));
  expect(output).toContain('Scores are not probabilities');
});

test('theme state is announced and accessible controls remain usable', async ({ page }) => {
  await page.goto('./');
  const toggle = page.getByRole('button', { name: /dark theme|어두운 테마/i });
  await expect(toggle).toHaveAttribute('aria-pressed', /true|false/);
  const before = await toggle.getAttribute('aria-pressed');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', before === 'true' ? 'false' : 'true');
  await expect(page.locator('nav.top-nav')).toHaveAttribute('aria-label', /navigation|내비게이션/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});

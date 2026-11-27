import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

/** The top bar never scrolls sideways: every area fits. */
const noSideScroll = async (page) => {
  const over = await page.evaluate(() => { const n = document.querySelector('nav[aria-label="Areas"], nav[aria-label="Main"]'); return n ? n.scrollWidth - n.clientWidth : 0; });
  expect(over, 'the top navigation overflows').toBeLessThanOrEqual(1);
};

test('teacher: Notices sit under Me and school, there is no Communication or "Messages to admin", and the top bar does not scroll', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  for (const width of [1280, 1470]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/teacher');
    await noSideScroll(page);
  }
  await page.getByRole('link', { name: 'Me and school' }).click();
  await expect(page.getByRole('link', { name: 'Notices', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Notices', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Notices' })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Notice to my class' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Messages to admin' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Messages', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Communication' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Queries to the office' })).toBeVisible();
  await page.goto('/teacher/communication'); // the old address still lands on Notices
  await expect(page.getByRole('heading', { name: 'Notices' })).toBeVisible();
  expect(problems.filter((p) => !/HTTP 40/.test(p)), problems.join('\n')).toEqual([]);
});

test('teacher: the Marks page is organised by examination and lists only the subjects he teaches; My class also follows the others, view only', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await page.goto('/teacher/exams');
  await expect(page.getByText('Marks to enter').first()).toBeVisible();
  await expect(page.getByText('Waiting for approval')).toBeVisible();
  const cards = page.locator('section, .card').filter({ has: page.getByRole('columnheader', { name: 'Subject' }) });
  await expect(cards.first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Taught by' })).toHaveCount(0); // everything here is his own
  await expect(page.getByText(/\d+ of \d+ submitted/).first()).toBeVisible();
  await page.goto('/teacher/my-class?tab=marks');
  await expect(page.getByRole('columnheader', { name: 'Taught by' }).first()).toBeVisible();
  expect(problems.filter((p) => !/HTTP 40/.test(p)), problems.join('\n')).toEqual([]);
});

test('Finance, Library and Transport have Notices, Queries to the office and the Help desk; the office desk has Notices', async ({ page }) => {
  const problems = watch(page);
  for (const [portal, id, pw, base] of [['finance', 'finance@gps.test', 'Finance@12345', '/finance'], ['library', 'library@gps.test', 'Library@12345', '/library'], ['transport', 'transport@gps.test', 'Transport@12345', '/transport']]) {
    await signIn(page, portal, id, pw);
    await page.goto(`${base}/notices`);
    await expect(page.getByRole('heading', { name: 'Notices' })).toBeVisible();
    await page.goto(`${base}/queries`);
    await expect(page.getByRole('heading', { name: 'Queries to the office' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ New query' })).toBeVisible();
    await page.goto(`${base}/helpdesk`);
    await expect(page.getByRole('heading', { name: 'Help desk' })).toBeVisible();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(base);
    await noSideScroll(page);
    await page.evaluate(() => { try { localStorage.clear(); } catch { /* ignore */ } });
    await page.context().clearCookies();
  }
  await signIn(page, 'staff', 'gps.s0001', 'Staff@12345');
  await page.goto('/staff/notices');
  await expect(page.getByRole('heading', { name: 'Notices' })).toBeVisible();
  await page.goto('/staff');
  await noSideScroll(page);
  expect(problems.filter((p) => !/HTTP 40/.test(p)), problems.join('\n')).toEqual([]);
});

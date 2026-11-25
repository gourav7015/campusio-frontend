import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('finance: find a student on the home page, see the dues and open the collect-payment form', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await page.getByLabel('Find a student to collect fees').fill('Aarav');
  await page.getByRole('button', { name: /Aarav Sharma/ }).first().click();
  await expect(page.getByText('To collect now')).toBeVisible();
  const collect = page.getByRole('button', { name: 'Collect payment and print receipt' });
  if (await collect.isEnabled()) { await collect.click(); await expect(page.getByRole('dialog', { name: 'Collect payment' })).toBeVisible(); }
  expect(problems).toEqual([]);
});

test('library: the book search on the home page suggests books, shows the book, and carries the chosen copy to the desk', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'library', 'library@gps.test', 'Library@12345');
  const box = page.getByLabel('Search a book by accession number, title or author');
  const list = page.getByRole('listbox', { name: 'Matching books' });
  // typing a title suggests copies; picking one shows the book with its copies and the next step
  await box.fill('malgudi');
  await expect(list.getByRole('option').first()).toContainText('Malgudi Days');
  await list.getByRole('option').first().click();
  const card = page.getByRole('region', { name: 'About Malgudi Days' });
  await expect(card).toContainText('R. K. Narayan');
  await expect(card).toContainText(/\d+ of \d+ copies available/);
  await expect(card.getByRole('radio').first()).toBeVisible();
  await card.getByRole('button', { name: 'Issue this book' }).click();
  await expect(page).toHaveURL(/\/library\/desk\?acc=LB\d+/);
  // a book that is out offers to take it back, and the return desk opens with it filled in
  await page.goto('/library');
  await box.fill('LB1');
  await list.getByRole('option').first().click();
  await expect(page.getByRole('region', { name: /About Wings of Fire/ })).toContainText('is with');
  await page.getByRole('button', { name: 'Return this book' }).click();
  await expect(page).toHaveURL(/\/library\/desk\?mode=return&acc=LB00001/);
  await expect(page.getByLabel(/Accession number, title/)).toHaveValue('LB00001');
  await expect(page.getByText(/Due /).first()).toBeVisible();
  expect(problems, problems.join('\n')).toEqual([]);
});

test('transport: every route is listed with its stops', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'transport', 'transport@gps.test', 'Transport@12345');
  await expect(page.getByRole('heading', { name: 'Routes' })).toBeVisible();
  const routes = page.getByRole('table', { name: 'Routes' });
  await expect(routes.getByRole('button').first()).toBeVisible();
  await routes.getByRole('button').first().click();
  await expect(page.getByRole('dialog', { name: /details$/ })).toBeVisible(); // the stops open in a side panel
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: /details$/ })).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('teacher and staff: areas along the top bar, the open area\'s pages beneath', async ({ page, browser }) => {
  const problems = watch(page);
  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  const areas = page.getByRole('navigation', { name: 'Areas' });
  await expect(areas.getByRole('link', { name: 'Today' })).toBeVisible();
  await expect(areas.getByRole('link', { name: 'Classes' })).toBeVisible();
  await areas.getByRole('link', { name: 'Classes' }).click();
  await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Attendance', exact: true })).toBeVisible();
  expect(problems).toEqual([]);
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const sp = await ctx.newPage();
  try {
    await signIn(sp, 'staff', 'gps.s0001', 'Staff@12345');
    await expect(sp.getByText('Desk queue')).toBeVisible();
    await expect(sp.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Employees' })).toBeVisible();
  } finally { await ctx.close(); }
});

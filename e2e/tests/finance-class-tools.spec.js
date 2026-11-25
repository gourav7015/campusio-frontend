import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test.describe.configure({ mode: 'serial' });

test('finance: Payments & receipts can be narrowed to one class', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  // make sure Aarav (Class 8 A) has a receipt
  await page.goto('/finance/students');
  await page.getByLabel('Search students').fill('Aarav Sharma');
  await page.getByRole('row', { name: /Aarav Sharma/ }).getByRole('button', { name: /Collect payment/ }).click();
  await page.getByRole('dialog', { name: 'Collect payment' }).getByLabel(/^Amount/).fill('500');
  await page.getByRole('dialog', { name: 'Collect payment' }).getByRole('button', { name: 'Collect ₹500' }).click();
  await expect(page.getByText(/Receipt .* issued/)).toBeVisible();
  await page.goto('/finance/payments');
  await page.getByLabel('Search payments').fill('Aarav Sharma');
  await expect(page.getByRole('row', { name: /Aarav Sharma/ }).first()).toBeVisible();
  await page.getByLabel('Class', { exact: true }).selectOption({ label: 'Class 8 B' });
  await expect(page.getByText('No payments match')).toBeVisible(); // Aarav is in 8 A
  await page.getByLabel('Class', { exact: true }).selectOption({ label: 'Class 8 A' });
  await expect(page.getByRole('row', { name: /Aarav Sharma/ }).first()).toBeVisible();
  expect(problems).toEqual([]);
});

test('finance: a class on the Defaulters page shows its students beside the list, with a way to collect', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await page.goto('/finance/defaulters');
  await page.getByRole('tab', { name: 'Group by class' }).click();
  await page.getByRole('row', { name: /Class 8/ }).first().click();
  const panel = page.getByRole('complementary', { name: /Defaulters in Class 8/ });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('button', { name: /Collect payment from/ }).first()).toBeVisible();
  await expect(panel.getByRole('button', { name: /Collect payment from/ }).first()).toBeInViewport(); // visible without scrolling down the page
  await panel.getByRole('button', { name: 'Close class' }).click();
  await expect(panel).toHaveCount(0);
  expect(problems).toEqual([]);
});

test('finance: an extra charge goes to one section only, and is never added twice', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await page.goto('/finance/students');
  const add = async (preview) => {
    await page.getByRole('button', { name: '+ Charge a section or class' }).click();
    const d = page.getByRole('dialog');
    await d.getByLabel('Section', { exact: true }).selectOption({ label: 'Class 8 A' });
    await d.getByLabel('Charge name').fill('Special coaching E2E');
    await d.getByLabel('Amount per student').fill('500');
    await d.getByRole('button', { name: 'Preview' }).click();
    return d;
  };
  let d = await add();
  await expect(d.getByText(/\d+ students?, ₹.* in all/)).toBeVisible();
  await expect(d.getByRole('row', { name: /Class 8 B/ })).toHaveCount(0);
  await d.getByRole('button', { name: /^Add to \d+ students?/ }).click();
  await expect(d.getByText(/was added for \d+ students?/)).toBeVisible();
  await d.getByRole('button', { name: 'Close' }).first().click();
  // it is on a student's own account
  await page.getByLabel('Search students').fill('Aarav Sharma');
  await page.getByRole('row', { name: /Aarav Sharma/ }).getByText('Aarav Sharma').click();
  await expect(page.getByText('Special coaching E2E').first()).toBeVisible();
  // asking again leaves everyone out
  await page.goto('/finance/students');
  d = await add();
  await expect(d.getByText(/Left out, already charged/)).toBeVisible();
  await expect(d.getByRole('button', { name: /^Add to/ })).toBeDisabled();
  expect(problems).toEqual([]);
});

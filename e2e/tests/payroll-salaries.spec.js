import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

async function signOut(page) {
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByText('Sign out').click();
  await expect(page).toHaveURL(/\/login$/);
}

/** The Salaries tab: filters you can see, ticking people, one change for all of them (previewed first), a side panel, and a CSV. */
test('finance: narrow the salary list, tick two teachers and give them a fixed increment', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await page.goto('/finance/payroll?tab=salaries');
  await expect(page.getByText(/\d+ people/).first()).toBeVisible();

  // filters narrow the list and the totals above it; "Clear filters" puts everyone back
  await page.getByLabel('Who', { exact: true }).selectOption('teacher');
  await expect(page.getByText(/^6 people of \d+/)).toBeVisible();
  await expect(page.getByRole('row', { name: /Kamla|Tarun/ })).toHaveCount(0);
  await page.getByLabel('Salary', { exact: true }).selectOption('without');
  await expect(page.getByText('Nobody matches these filters')).toBeVisible(); // every teacher has a salary
  await expect(page.getByRole('button', { name: 'Give an increment…' })).toBeDisabled(); // nobody here has pay to raise
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByLabel('Who', { exact: true })).toHaveValue('all');

  // the side panel shows one person's pay without leaving the list
  await page.getByLabel('Search people').fill('Anil');
  await page.getByRole('row', { name: /Anil Verma/ }).getByText('Anil Verma').click();
  const panel = page.getByRole('complementary', { name: /Anil Verma, salary preview/ });
  await expect(panel).toContainText('Take-home per month');
  await expect(panel.getByRole('button', { name: 'Revise salary' })).toBeVisible();
  await panel.getByRole('button', { name: 'Close preview' }).click();
  await page.getByLabel('Search people').fill('');

  // tick two teachers; the bar says how many, and the change reaches only them
  await page.getByLabel('Who', { exact: true }).selectOption('teacher');
  await page.getByLabel('Select Anil Verma').check();
  await page.getByLabel('Select Imran Khan').check();
  await expect(page.getByText('2 selected')).toBeVisible();
  await page.getByRole('button', { name: 'Increment for selected…' }).click();
  const d = page.getByRole('dialog');
  await expect(d.getByLabel('Who gets it', { exact: true })).toContainText('The 2 I ticked');
  await d.getByLabel('Increase by', { exact: true }).selectOption('amount');
  await d.getByLabel('Amount').fill('2000');
  // from the first of next month: an earlier month may already be approved and paid, and that is refused
  const now = new Date(); const next = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)).toISOString().slice(0, 10);
  await d.getByLabel('Effective from').fill(next);
  await d.getByRole('button', { name: 'Preview' }).click();
  await expect(d.getByText(/2 people\. Monthly salary bill/)).toBeVisible();
  await expect(d.getByRole('row', { name: /Anil Verma/ })).toContainText('₹28,000 → ₹30,000');
  await expect(d.getByRole('row', { name: /Meera Gupta/ })).toHaveCount(0); // not ticked, not touched
  await d.getByRole('button', { name: /^Apply to 2 people/ }).click();
  await expect(d.getByText(/New salary saved for 2 people/)).toBeVisible();
  await d.getByRole('button', { name: 'Close' }).first().click();
  // the new pay is on record from next month (the list still shows today's pay); the person who was not ticked has no new line
  await page.getByRole('row', { name: /Anil Verma/ }).getByText('Anil Verma').click();
  await expect(page.getByRole('complementary', { name: /Anil Verma, salary preview/ })).toContainText('₹30,000');
  await page.getByRole('row', { name: /Meera Gupta/ }).getByText('Meera Gupta').click();
  await expect(page.getByRole('complementary', { name: /Meera Gupta, salary preview/ })).not.toContainText('₹30,000');

  // the filtered list can be saved as a file
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /^Export/ }).click()]);
  expect(file.suggestedFilename()).toMatch(/^salaries-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(problems).toEqual([]);
  await signOut(page);

  // the School Admin can filter and look, but has no button that changes pay
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/payroll?tab=salaries');
  await page.getByLabel('Who', { exact: true }).selectOption('teacher');
  await expect(page.getByText(/^6 people of \d+/)).toBeVisible();
  for (const name of ['Give an increment…', 'Apply pay level…', 'Revise']) await expect(page.getByRole('button', { name })).toHaveCount(0);
});

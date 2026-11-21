import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('Finance has no academic-year chip; money received can be viewed for a financial year or any two dates', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await expect(page.getByRole('heading', { name: 'Fees overview' })).toBeVisible();
  await expect(page.getByTitle('Current academic year')).toHaveCount(0); // the school's academic year means nothing in the accounts
  const period = page.getByRole('region', { name: 'Money received in a period' });
  await expect(period.getByRole('combobox')).toHaveValue('fy');
  await expect(period.getByRole('option', { name: /This financial year \(\d{4}–\d{2}\)/ })).toHaveCount(1);
  // the financial year runs 1 April to 31 March
  const from = await period.getByLabel('From', { exact: true }).inputValue(); const to = await period.getByLabel('To', { exact: true }).inputValue();
  expect(from).toMatch(/^\d{4}-04-01$/); expect(to).toMatch(/^\d{4}-03-31$/);
  await expect(period.getByText(/Collected,/)).toBeVisible();
  // last financial year, then custom dates
  await period.getByRole('combobox').selectOption('last');
  await expect(period.getByLabel('From', { exact: true })).toHaveValue(`${Number(from.slice(0, 4)) - 1}-04-01`);
  await expect(period.getByText(/Collected,/)).toBeVisible();
  await period.getByLabel('From', { exact: true }).fill(`${from.slice(0, 4)}-05-01`);
  await expect(period.getByRole('combobox')).toHaveValue('custom');
  await period.getByLabel('To', { exact: true }).fill(`${from.slice(0, 4)}-04-01`); // before "from"
  await expect(period.getByText('Choose a "from" date that is not after the "to" date.')).toBeVisible();
  expect(problems).toEqual([]);
});

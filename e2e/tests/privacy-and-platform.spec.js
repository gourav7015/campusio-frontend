import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test.describe.configure({ mode: 'serial' });

test('a student’s Privacy tab: record consent, download everything held, and no erasure while the student is active', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/students');
  await page.getByLabel(/Search|Find/i).first().fill('Aarav Sharma').catch(() => {});
  await page.getByRole('row', { name: /Aarav Sharma/ }).first().click(); // a row opens the preview beside the list
  await page.getByRole('link', { name: 'Open full profile' }).click();
  await page.getByRole('tab', { name: 'Privacy' }).click();
  await expect(page.getByText('Not recorded')).toBeVisible();
  await page.getByLabel("Guardian's name").fill('Rakesh Sharma');
  await page.getByLabel('Relationship').fill('Father');
  await page.getByRole('button', { name: 'Record consent' }).click();
  await expect(page.getByText('Recorded', { exact: true })).toBeVisible();
  await expect(page.getByText('Rakesh Sharma (Father)')).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download data (JSON)' }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^student-.*-data\.json$/);
  await expect(page.getByText('Only a student who has left the school can be erased')).toBeVisible();
  await page.getByRole('button', { name: 'Remove record' }).click();
  await page.getByRole('button', { name: /^Confirm|^Yes|^Remove/ }).last().click();
  await expect(page.getByText('Not recorded')).toBeVisible();
  expect(problems).toEqual([]);
});

test('the platform admin sees errors and can switch a feature on for one school', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'platform', 'superadmin@erp.local', 'Super@12345');
  await page.getByRole('link', { name: 'Errors' }).click();
  await expect(page.getByRole('heading', { name: 'Errors' })).toBeVisible();
  await expect(page.getByText('Server errors, last 24 hours')).toBeVisible();
  await page.goto('/platform/schools');
  await page.getByRole('link', { name: /Greenfield|Demo|Public School|gps/i }).first().click();
  await expect(page.getByText('Feature switches', { exact: true })).toBeVisible();
  await expect(page.getByText('Student attendance', { exact: true })).toBeVisible(); // the attendance way is the school's plan, set from here
  const sel = page.getByLabel('Stamps and signatures on documents');
  await sel.selectOption('false');
  await expect(sel).toHaveValue('false');
  await expect(page.getByText('Changed').first()).toBeVisible();
  await sel.selectOption('default');
  await expect(sel).toHaveValue('default');
  expect(problems).toEqual([]);
});

import { test, expect } from '@playwright/test';
import { signIn } from './helpers.js';

test('with no internet the app says so: a banner, and a "No internet connection" page instead of an app error', async ({ page, context }) => {
  await signIn(page, 'library', 'library@gps.test', 'Library@12345');
  await expect(page.getByText(/No internet connection\. Changes cannot be saved/)).toHaveCount(0);
  await context.setOffline(true);
  await expect(page.getByText(/No internet connection\. Changes cannot be saved/)).toBeVisible();
  // a page that has to load data says it is the connection, and offers to try again
  await page.getByRole('link', { name: /Books|Catalogue/i }).first().click();
  await expect(page.getByRole('heading', { name: 'No internet connection' })).toBeVisible();
  await expect(page.getByText(/Our school bus broke down|Something went wrong/)).toHaveCount(0);
  await context.setOffline(false);
  await expect(page.getByText(/No internet connection\. Changes cannot be saved/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Try again' }).first().click();
  await expect(page.getByRole('heading', { name: 'No internet connection' })).toHaveCount(0);
});

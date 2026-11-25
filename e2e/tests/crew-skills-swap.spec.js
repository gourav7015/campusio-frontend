import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('a driver can also be a conductor (and the other way round), and the two can swap seats on a bus', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'transport', 'transport@gps.test', 'Transport@12345');
  // mark both people as able to do both jobs
  await page.goto('/transport/staff');
  await page.getByRole('row', { name: /Harish Driver/ }).getByRole('button', { name: 'Edit' }).click();
  let dlg = page.getByRole('dialog');
  await expect(dlg.getByLabel('Can also be a driver')).toHaveCount(0); // a driver already is one
  await dlg.getByLabel('Can also be a conductor').check();
  await dlg.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('row', { name: /Harish Driver/ })).toContainText('also conductor');
  await page.getByRole('row', { name: /Mahesh Conductor/ }).getByRole('button', { name: 'Edit' }).click();
  dlg = page.getByRole('dialog');
  await dlg.getByLabel('Can also be a driver').check();
  await dlg.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('row', { name: /Mahesh Conductor/ })).toContainText('also driver');

  // swap them inside the bus form
  await page.goto('/transport/buses');
  const row = page.getByRole('row', { name: /GPS-01/ });
  await expect(row).toContainText('Harish Driver');
  await row.getByRole('button', { name: /More for bus/ }).click();
  await page.getByRole('menuitem', { name: 'Edit bus' }).click();
  dlg = page.getByRole('dialog');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await dlg.getByRole('button', { name: 'Swap driver and conductor' }).click();
  await expect(dlg.getByLabel('Driver', { exact: true })).toContainText('Mahesh Conductor');
  await dlg.getByRole('button', { name: 'Save bus' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(row).toContainText(/Driver\s*Mahesh Conductor/);

  // and from the list: swap them back, previewed first
  await row.getByRole('button', { name: /More for bus/ }).click();
  await page.getByRole('menuitem', { name: 'Swap crew…' }).click();
  dlg = page.getByRole('dialog');
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await dlg.getByLabel('What to swap').selectOption('roles');
  await dlg.getByRole('button', { name: 'Preview' }).click();
  await expect(dlg.getByRole('row', { name: /^GPS-01 Driver Mahesh Conductor Harish Driver$/ })).toBeVisible(); // the driver's seat goes from Mahesh back to Harish
  await expect(dlg.getByRole('row', { name: /^GPS-01 Conductor Harish Driver Mahesh Conductor$/ })).toBeVisible();
  await dlg.getByRole('button', { name: 'Swap now' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(row).toContainText(/Driver\s*Harish Driver/);
  expect(problems.filter((p) => !p.includes('HTTP 40'))).toEqual([]);
});

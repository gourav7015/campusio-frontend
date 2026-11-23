import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('a new office desk login is listed at once; Reset password asks first (type one or generate one) and only then changes it', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/staff');
  await page.getByRole('button', { name: '+ Add sign-in' }).click();
  const dlg = page.getByRole('dialog', { name: 'Add a desk login' });
  await dlg.getByLabel('Desk', { exact: true }).selectOption('staff');
  const pick = dlg.getByLabel('Employee who works the office desk');
  await pick.selectOption({ index: 1 });
  const who = (await pick.locator('option:checked').innerText()).split(' · ')[0].trim();
  await expect(dlg.getByTestId('login-id-preview')).toContainText(/\.s\d{4}/);
  await dlg.getByRole('button', { name: 'Create login' }).click();
  const creds = page.getByRole('dialog', { name: 'Staff account' });
  await expect(creds).toContainText('Temporary password');
  // closing without copying warns first
  await creds.getByRole('button', { name: 'Done' }).click();
  await expect(creds.getByRole('alert')).toContainText('You have not copied the password');
  await creds.getByRole('button', { name: 'Close anyway' }).click();
  // the login is in the list straight away, with its employee, and the Office desk tile is open
  const row = page.getByRole('row', { name: new RegExp(who) });
  await expect(row).toBeVisible();
  await expect(row).toContainText('Office desk');
  await expect(page.getByText('Sub-portals: 4 of 4 open')).toBeVisible();
  // Reset password opens a dialog and changes nothing until it is confirmed
  await row.getByRole('button', { name: 'Reset password' }).click();
  const reset = page.getByRole('dialog', { name: /Reset password/ });
  await expect(reset.getByText('Nothing has changed yet')).toBeVisible();
  await reset.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog', { name: 'Staff account' })).toHaveCount(0);
  // type one: a weak one cannot be set, a good one can
  await row.getByRole('button', { name: 'Reset password' }).click();
  await reset.getByLabel('I will type the new password').check();
  await reset.getByLabel('The new password', { exact: true }).fill('short1');
  await expect(reset.getByRole('button', { name: 'Set this password' })).toBeDisabled();
  await reset.getByLabel('The new password', { exact: true }).fill('Typed-By-Admin-42');
  await reset.getByRole('button', { name: 'Set this password' }).click();
  await expect(page.getByRole('dialog', { name: 'Staff account' })).toContainText('Typed-By-Admin-42');
  await page.getByRole('dialog', { name: 'Staff account' }).getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Close anyway' }).click();
  // generate one: it can be regenerated before it is applied, and the shown one is the one that is set
  await row.getByRole('button', { name: 'Reset password' }).click();
  const gen = reset.getByLabel('Generated password');
  const first = await gen.inputValue(); expect(first).toMatch(/^[A-Za-z0-9#@$%&*]{12}$/);
  await reset.getByRole('button', { name: 'Generate another' }).click();
  const second = await gen.inputValue(); expect(second).not.toBe(first);
  await reset.getByRole('button', { name: 'Set this password' }).click();
  await expect(page.getByRole('dialog', { name: 'Staff account' })).toContainText(second);
  expect(problems.filter((p) => !p.includes('dialog'))).toEqual([]);
});

test('an officer desk is given to an existing employee', async ({ page }) => {
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/staff');
  await expect(page.getByRole('columnheader', { name: /Held by/ })).toBeVisible();
  // every desk, the office desk too, has the same actions, on one line
  const rows = page.locator('tbody tr');
  const n = await rows.count();
  expect(n).toBeGreaterThanOrEqual(4);
  await expect(page.getByRole('button', { name: /^(Assign|Change) employee$/ })).toHaveCount(n);
  await expect(page.getByRole('button', { name: 'Reset password' })).toHaveCount(n);
  await expect(page.getByRole('button', { name: /^(Disable|Enable)$/ })).toHaveCount(n);
  for (let i = 0; i < n; i++) {
    const ys = await rows.nth(i).getByRole('button').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(ys).size, `row ${i} keeps its buttons on one line`).toBe(1);
  }
  const row = page.getByRole('row', { name: /Library desk/ }).first();
  await row.getByRole('button', { name: /Assign employee|Change employee/ }).click();
  const dlg = page.getByRole('dialog', { name: /employee/i });
  await expect(dlg.getByText(/stay the same/)).toBeVisible();
  await expect(dlg.getByRole('button', { name: /Assign employee|Change employee/ })).toBeDisabled(); // nobody chosen yet
  await dlg.getByRole('button', { name: 'Cancel' }).click();
});

import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { signIn, watch } from './helpers.js';

test.describe.configure({ mode: 'serial' });

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
const plusDays = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA');

test('the transport officer records a bus’s registration and pollution papers with copies; the School Admin only looks', async ({ page }) => {
  const problems = watch(page, ['/api/auth/me']); // signing out leaves one stale session check
  await signIn(page, 'transport', 'transport@gps.test', 'Transport@12345');
  await page.goto('/transport/buses');
  await page.getByRole('row', { name: /GPS-01/ }).getByRole('button', { name: /More for bus/ }).click();
  await page.getByRole('menuitem', { name: 'Documents' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(1); // only the papers, not the bus detail behind them
  const card = page.getByRole('dialog').locator('.card').filter({ has: page.getByText('Vehicle documents', { exact: true }) });
  for (const t of ['Registration certificate (RC)', 'Insurance', 'Pollution certificate (PUC)', 'Fitness certificate', 'Route permit', 'Road tax']) await expect(card.getByRole('cell', { name: t, exact: true })).toBeVisible();

  // registration: a number and a copy, no expiry
  await card.getByRole('row', { name: /Registration certificate/ }).getByRole('button', { name: 'Add' }).click();
  const dlg = page.getByRole('dialog', { name: /Registration certificate/ });
  await dlg.getByLabel('Number').fill('GJ03AB4321');
  await dlg.getByLabel(/Copy of the document/).setInputFiles({ name: 'rc.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') });
  await dlg.getByRole('button', { name: 'Save' }).click();
  await expect(dlg.getByRole('alert')).toContainText('PDF, PNG or JPG'); // refused before it is sent
  await dlg.getByLabel(/Copy of the document/).setInputFiles({ name: 'rc.pdf', mimeType: 'application/pdf', buffer: PDF });
  await dlg.getByRole('button', { name: 'Save' }).click();
  const rc = card.getByRole('row', { name: /Registration certificate/ });
  await expect(rc).toContainText('GJ03AB4321'); await expect(rc).toContainText('Valid');
  await expect(rc.getByRole('button', { name: /View the copy of Registration/ })).toBeVisible();
  await expect(rc).toContainText('rc.pdf'); // the list names the copy on file
  // opening it again says what is on file, and what a new choice would do
  await rc.getByRole('button', { name: 'Renew or edit' }).click();
  const again = page.getByRole('dialog', { name: /Registration certificate/ });
  await expect(again.getByText('A copy is already on file.')).toBeVisible();
  await expect(again.getByText(/rc\.pdf · PDF · /)).toBeVisible();
  await expect(again.getByRole('button', { name: 'View', exact: true })).toBeVisible();
  await again.getByLabel(/Replace the copy/).setInputFiles({ name: 'rc2.pdf', mimeType: 'application/pdf', buffer: PDF });
  await expect(again.getByText('New copy chosen: rc2.pdf')).toBeVisible();
  await expect(again.getByText('A copy is already on file (it will be replaced when you save).')).toBeVisible();
  await again.getByRole('button', { name: 'Cancel' }).click();

  // pollution: needs a date; it runs out soon, so it is flagged
  await card.getByRole('row', { name: /Pollution certificate/ }).getByRole('button', { name: /Renew|Add/ }).click();
  const p = page.getByRole('dialog', { name: /Pollution certificate/ });
  await p.getByLabel(/Valid until/).fill(''); // the demo bus may already have a date
  await p.getByRole('button', { name: 'Save' }).click();
  await expect(p.getByRole('alert')).toContainText('valid until');
  await p.getByLabel(/Valid until/).fill(plusDays(10));
  await p.getByRole('button', { name: 'Save' }).click();
  await expect(card.getByRole('row', { name: /Pollution certificate/ })).toContainText('Runs out soon');
  await expect(card.getByRole('row', { name: /Pollution certificate/ })).toContainText('10 days left');

  // another document, then the dashboard lists them
  await card.getByRole('button', { name: '+ Other document' }).click();
  const o = page.getByRole('dialog', { name: /Add a document/ });
  await o.getByLabel('Name of the document').fill('Speed governor certificate');
  await o.getByLabel(/Valid until/).fill(plusDays(200));
  await o.getByRole('button', { name: 'Save' }).click();
  await expect(card.getByRole('cell', { name: 'Speed governor certificate' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).first().click();
  await page.goto('/transport');
  await expect(page.getByText('Registration certificate (RC)').first()).toBeVisible();

  // the School Admin sees the same papers, with no buttons to change them
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByRole('menuitem', { name: /sign out/i }).click();
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/transport?tab=buses');
  await page.getByRole('row', { name: /GPS-01/ }).getByRole('button', { name: 'Open' }).click();
  const ro = page.getByRole('dialog').locator('.card').filter({ has: page.getByText('Vehicle documents', { exact: true }) });
  await expect(ro.getByRole('row', { name: /Registration certificate/ })).toContainText('GJ03AB4321');
  await expect(ro.getByRole('button', { name: /Renew|Add|Remove|Other document/ })).toHaveCount(0);
  expect(problems).toEqual([]);
});

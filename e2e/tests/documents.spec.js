import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { signIn, watch } from './helpers.js';

test.describe.configure({ mode: 'serial' });

// a real 1×1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('the school sets its letterhead, uploads a signature and a stamp, assigns them, and previews the real PDFs', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.getByRole('link', { name: 'Receipts and payslips' }).click();
  await expect(page.getByRole('heading', { name: 'Documents and signatures' })).toBeVisible();
  await expect(page.getByText('Nothing uploaded yet')).toBeVisible();

  // upload a signature, then a stamp
  const upload = async (kind, name) => {
    await page.getByRole('button', { name: 'Upload stamp or signature' }).click();
    const dlg = page.getByRole('dialog', { name: 'Upload stamp or signature' });
    await dlg.getByLabel('What is it?').selectOption(kind);
    await dlg.getByLabel('Name').fill(name);
    await dlg.getByLabel('Image').setInputFiles({ name: `${kind}.png`, mimeType: 'image/png', buffer: PNG });
    await dlg.getByRole('button', { name: 'Upload' }).click();
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  };
  await upload('signature', 'Principal signature');
  await upload('stamp', 'School seal');

  // a wrong file type is refused before it is sent
  await page.getByRole('button', { name: 'Upload stamp or signature' }).click();
  const dlg = page.getByRole('dialog', { name: 'Upload stamp or signature' });
  await dlg.getByLabel('Name').fill('Bad file');
  await dlg.getByLabel('Image').setInputFiles({ name: 'x.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') });
  await dlg.getByRole('button', { name: 'Upload' }).click();
  await expect(dlg.getByRole('alert')).toContainText('PNG or JPG');
  await dlg.getByRole('button', { name: 'Cancel' }).click();

  // assign them, pick a colour, save
  const receipt = page.locator('.card').filter({ has: page.getByText('Fee receipt', { exact: true }) });
  await receipt.getByLabel('Signature', { exact: true }).selectOption({ label: 'Principal signature' });
  await receipt.getByLabel('Stamp', { exact: true }).selectOption({ label: 'School seal' });
  await page.getByRole('radio', { name: 'Teal' }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Saved').first()).toBeVisible();
  await expect(page.getByText('Used on: Fee receipt').first()).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Teal' })).toHaveAttribute('aria-checked', 'true');

  // the sample PDF is made from these settings and opens in a new tab
  const [pdf] = await Promise.all([page.waitForResponse((r) => r.url().includes('/document-settings/sample/receipt')), page.waitForEvent('popup'), receipt.getByRole('button', { name: 'Preview sample' }).click()]);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toBe('application/pdf');
  expect((await pdf.body()).subarray(0, 4).toString()).toBe('%PDF');

  expect(problems.filter((p) => !/blob:|Failed to load resource/.test(String(p)))).toEqual([]);
});

import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { signIn, watch } from './helpers.js';

test.describe.configure({ mode: 'serial' });

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
const uid = Date.now().toString(36);
const signOut = async (page) => { await page.getByRole('button', { name: 'Profile menu' }).click(); await page.getByRole('menuitem', { name: /sign out/i }).click(); };

test('a new vendor and its expense are approved by the School Admin first; Finance pays only after approval, with the bill attached', async ({ page }) => {
  const problems = watch(page, ['/api/auth/me']);
  const vendor = `Bright Stationers ${uid}`;
  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await page.goto('/finance/vendors');
  await page.getByRole('button', { name: '+ Add vendor' }).click();
  let dlg = page.getByRole('dialog');
  await dlg.getByLabel('Vendor name').fill(vendor);
  await dlg.getByLabel('Category').fill('Stationery');
  await dlg.getByLabel('Phone').fill('9876543210');
  await dlg.getByLabel('Bank', { exact: true }).fill('State Bank');
  await dlg.getByLabel('Account number').fill('123456789012');
  await dlg.getByRole('button', { name: 'Save and send for approval' }).click();
  await expect(page.getByRole('row', { name: new RegExp(vendor) })).toContainText('Waiting');
  await expect(page.getByRole('row', { name: new RegExp(vendor) })).toContainText('••••9012'); // the account number is masked in the list

  // not approved yet, so it cannot be chosen on an expense
  await page.goto('/finance/expenses');
  await page.getByRole('button', { name: '+ Add expense' }).click();
  dlg = page.getByRole('dialog');
  await expect(dlg.getByLabel('Paid to (approved vendor)').locator('option', { hasText: vendor })).toHaveCount(0);
  await dlg.getByRole('button', { name: 'Cancel' }).click();
  await signOut(page);

  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/approvals');
  const vrow = page.getByRole('row', { name: new RegExp(vendor) });
  await expect(vrow).toBeVisible();
  await vrow.getByRole('button', { name: 'Approve' }).click();
  await expect(vrow.getByRole('button', { name: 'Approve' })).toHaveCount(0); // the decision stays on the page, as history: it can no longer be approved again
  await expect(vrow).toContainText('Approved');
  await signOut(page);

  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await page.goto('/finance/expenses');
  await page.getByRole('button', { name: '+ Add expense' }).click();
  dlg = page.getByRole('dialog');
  await dlg.getByLabel('Amount (₹)').fill('8200');
  await dlg.getByLabel('Type of spending').selectOption('capital');
  await dlg.getByLabel('Department').fill('Office');
  await dlg.getByLabel('What was it for?').fill(`Almirah ${uid}`);
  const opt = dlg.getByLabel('Paid to (approved vendor)').locator('option', { hasText: vendor });
  await dlg.getByLabel('Paid to (approved vendor)').selectOption(await opt.getAttribute('value'));
  await dlg.getByRole('button', { name: 'Save and add bills' }).click();
  dlg = page.getByRole('dialog', { name: new RegExp(`Almirah ${uid}`) });
  await expect(dlg).toContainText('Money can be paid only after the School Admin approves');
  await dlg.getByLabel('Attach a file').setInputFiles({ name: 'bill.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') });
  await dlg.getByLabel('Attach a file').setInputFiles({ name: 'bill.pdf', mimeType: 'application/pdf', buffer: PDF });
  await expect(dlg.getByText('bill.pdf')).toBeVisible();
  await expect(dlg.getByRole('button', { name: 'Record payment' })).toHaveCount(0); // not approved: no payment form
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(page.getByRole('row', { name: new RegExp(`Almirah ${uid}`) })).toContainText('Capital');
  await expect(page.getByRole('row', { name: new RegExp(`Almirah ${uid}`) })).toContainText('1 file');
  await signOut(page);

  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/approvals');
  const erow = page.getByRole('row', { name: new RegExp(`Almirah ${uid}`) });
  await expect(erow.getByRole('button', { name: 'View bill.pdf' })).toBeVisible(); // the approver can open the bill
  await erow.getByRole('button', { name: 'Approve' }).click();
  await expect(erow.getByRole('button', { name: 'Approve' })).toHaveCount(0); // decided rows stay as history
  await expect(erow).toContainText('Approved');
  await signOut(page);

  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await page.goto('/finance/expenses');
  const row = page.getByRole('row', { name: new RegExp(`Almirah ${uid}`) });
  await expect(row).toContainText('To pay');
  await row.getByRole('button', { name: 'Pay' }).click();
  dlg = page.getByRole('dialog', { name: new RegExp(`Almirah ${uid}`) });
  await dlg.getByLabel('Reference (UTR / cheque no.)').fill('UTR12345');
  await dlg.getByRole('button', { name: /Record payment of/ }).click();
  await expect(dlg).toContainText('UTR12345');
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(row).toContainText('Paid');
  await signOut(page);
  expect(problems.filter((p) => !p.includes('dialog') && !/HTTP 40[13]/.test(p))).toEqual([]);
});

test('budgets are revenue or capital; the fees overview lists every instalment; the student sees theirs', async ({ page }) => {
  const problems = watch(page, ['/api/auth/me']);
  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await page.goto('/finance/budgets');
  await page.getByRole('button', { name: '+ Set a budget' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Budget type').selectOption('capital');
  await dlg.getByLabel('Department').fill(`Library ${uid}`);
  await dlg.getByLabel('Allocated (₹)').fill('250000');
  await dlg.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('tab', { name: 'Capital budget' }).click();
  await expect(page.getByRole('row', { name: new RegExp(`Library ${uid}`) })).toContainText('Capital');
  await page.getByRole('tab', { name: 'Revenue budget' }).click();
  await expect(page.getByRole('row', { name: new RegExp(`Library ${uid}`) })).toHaveCount(0);

  await page.goto('/finance');
  await expect(page.getByRole('heading', { name: 'Instalment-wise collection' })).toBeVisible();
  await expect(page.getByRole('table', { name: /Fee instalments/ })).toBeVisible();
  await signOut(page);

  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await page.goto('/student/fees');
  await expect(page.getByText('Fees', { exact: true }).first()).toBeVisible(); // one table: instalments with their charges underneath
  await expect(page.getByText('Dues & due dates')).toHaveCount(0);
  await expect(page.getByRole('cell', { name: 'Paid', exact: true }).or(page.getByRole('cell', { name: 'Open', exact: true })).or(page.getByRole('cell', { name: 'Overdue', exact: true })).first()).toBeVisible();
  await signOut(page);
  expect(problems.filter((p) => !p.includes('dialog') && !/HTTP 40[13]/.test(p))).toEqual([]);
});

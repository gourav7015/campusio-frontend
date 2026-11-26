import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('the library desk suggests books while typing (issue and return), finds borrowers by class and status, and the catalogue and loans have real filters', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'library', 'library@gps.test', 'Library@12345');
  await page.goto('/library/desk');
  await expect(page.getByRole('heading', { name: 'Issue and return' })).toBeVisible();

  // the book box works before anyone is chosen
  await page.getByLabel('Accession number, title or author').fill('malgudi');
  await expect(page.getByRole('listbox', { name: 'Matching books' }).getByRole('option').first()).toContainText('Malgudi Days');
  await expect(page.getByText('Now choose who is borrowing')).toBeVisible();
  await page.getByLabel('Accession number, title or author').fill('');

  // borrower filters are visible fields: class, section, show
  await expect(page.getByLabel('Class')).toBeVisible();
  await expect(page.getByLabel('Section')).toBeVisible();
  await page.getByLabel('Show').selectOption('canBorrow');
  const first = page.getByRole('list', { name: 'Borrowers' }).getByRole('button').first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page.getByText(/books out/)).toBeVisible();

  const list = page.getByRole('listbox', { name: 'Matching books' });
  // the book block has its own filters, and the box is usable before anyone is picked
  for (const l of ['Book category', 'Book availability']) await expect(page.getByLabel(l)).toBeVisible();
  await page.getByLabel('Book category').selectOption('Fiction');
  await expect(list.getByRole('option').first()).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).last().click();
  // suggestions by title, then by a short number typed without the zero padding
  const book = page.getByLabel('Accession number, title or author');
  await book.fill('panchatantra');
  const opt = list.getByRole('option').filter({ hasText: 'Panchatantra' }).first();
  await expect(opt).toBeVisible();
  await expect(opt).toContainText('Available');
  await book.fill('LB5');
  await expect(list.getByRole('option').first()).toContainText('LB00005');
  await book.fill('panchatantra');
  await list.getByRole('option').filter({ hasText: 'Available' }).first().click();
  await expect(page.getByText(/Panchatantra — Vishnu Sharma/)).toBeVisible();
  await page.getByRole('button', { name: 'Issue book' }).click();
  await expect(page.getByText(/Issued Panchatantra to /)).toBeVisible();

  // the return desk suggests books that are out, with who holds them
  await page.getByRole('tab', { name: 'Return a book' }).click();
  const ret = page.getByLabel(/Accession number, title/);
  await ret.fill('panchatantra');
  const out = list.getByRole('option').first();
  await expect(out).toContainText('due');
  await out.click();
  await expect(page.getByText('Due ', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Return book' }).click();
  await expect(page.getByText(/returned/).first()).toBeVisible();

  // catalogue: more filters
  await page.goto('/library/books');
  await expect(page.getByLabel('Category')).toBeVisible();
  await expect(page.getByLabel('Shelf')).toBeVisible();
  await expect(page.getByLabel('Author')).toBeVisible();
  await expect(page.getByLabel('Availability')).toBeVisible();
  await expect(page.getByLabel('Sort')).toBeVisible();
  await page.getByLabel('Sort').selectOption('popular');
  await page.getByLabel('Category').selectOption('Fiction');
  await expect(page.getByText('Malgudi Days').first()).toBeVisible();
  await expect(page.getByText('Oxford Dictionary')).toHaveCount(0);

  // loans: borrower type, class, category and due dates
  await page.goto('/library/loans');
  for (const l of ['Status', 'Borrower type', 'Class', 'Category', 'Due from', 'Due to']) await expect(page.getByLabel(l, { exact: true })).toBeVisible();
  await page.getByLabel('Status', { exact: true }).selectOption('overdue');
  await expect(page.getByText('Wings of Fire').or(page.getByText('Malgudi Days')).first()).toBeVisible();
  await page.getByLabel('Borrower type', { exact: true }).selectOption('teacher');
  await expect(page.getByText('No loans match these filters')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  expect(problems, problems.join('\n')).toEqual([]);
});

test('library-use-only books can be marked, are not lent, and single copies can be deleted', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'library', 'library@gps.test', 'Library@12345');
  await page.goto('/library/books');
  await page.getByRole('button', { name: '+ Add book' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Title').fill('Atlas of India');
  await dlg.getByLabel('Number of copies').fill('2');
  await dlg.getByLabel('Library use only').check();
  await dlg.getByRole('button', { name: /^(Save|Add|Create)/ }).first().click();
  await expect(page.getByText(/Added\. Accession numbers/)).toBeVisible();
  await page.getByLabel('Availability').selectOption('reference');
  await expect(page.getByText('Atlas of India')).toBeVisible();
  await expect(page.locator('li').filter({ hasText: 'Atlas of India' }).getByText('Library use only')).toBeVisible();
  await page.getByText('Atlas of India').click();
  await expect(page.getByText(/can't be borrowed/)).toBeVisible();
  // delete one copy
  await page.getByRole('button', { name: /Delete copy LB/ }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete copy' }).click();
  await expect(page.getByText('Copies (1)')).toBeVisible();
  expect(problems, problems.join('\n')).toEqual([]);
});

test('By class opens with every class at a glance, and the Show filter stays pinned', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'library', 'library@gps.test', 'Library@12345');
  await page.goto('/library/classes');
  // nothing is empty: the whole school's classes, with who borrowed, holds and is late
  await expect(page.getByRole('heading', { name: 'Every class' }).or(page.getByText('Every class')).first()).toBeVisible();
  await expect(page.getByText('Borrowed a book this year').first()).toBeVisible();
  const row = page.getByRole('row', { name: /Class 8 A/ });
  await expect(row).toBeVisible();
  // pin a filter, open a class: it is applied there, and it is still there when the page is opened again
  await page.getByRole('combobox', { name: 'Show', exact: true }).selectOption('holding');
  await expect(page.getByText('Pinned: Holding a book now')).toBeVisible();
  await row.click();
  await expect(page.getByRole('combobox', { name: 'Class' })).toHaveValue(/.+/);
  await expect(page.getByRole('combobox', { name: 'Show', exact: true })).toHaveValue('holding');
  await page.getByRole('combobox', { name: 'Class' }).selectOption({ label: 'Class 7' });
  await expect(page.getByRole('combobox', { name: 'Show', exact: true })).toHaveValue('holding');
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Show', exact: true })).toHaveValue('holding');
  // and it can be changed
  await page.getByRole('combobox', { name: 'Show', exact: true }).selectOption('all');
  await expect(page.getByText(/^Pinned:/)).toHaveCount(0);
  expect(problems, problems.join('\n')).toEqual([]);
});

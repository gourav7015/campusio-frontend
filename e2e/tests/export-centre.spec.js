import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('the Export centre narrows a list by class and columns, previews it, and downloads exactly that', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/reports');
  await expect(page.getByText('Export centre', { exact: true })).toBeVisible();

  // students: every class at first, then one class
  await page.getByRole('tab', { name: 'Student profiles' }).click();
  await expect(page.getByText(/^\d+ rows?$/)).toBeVisible();
  const all = Number((await page.getByText(/^\d+ rows?$/).innerText()).split(' ')[0]);
  const classes = page.getByRole('group', { name: 'Classes' });
  await classes.getByRole('button').first().click();
  await expect.poll(async () => Number((await page.getByText(/^\d+ rows?$/).innerText()).split(' ')[0])).toBeLessThan(all);
  await expect(page.getByRole('group', { name: 'Sections' })).toBeVisible(); // sections of the chosen class appear

  // the columns can be chosen, and the file has just those
  await page.getByText(/^Columns \(/).click();
  await page.getByRole('checkbox', { name: 'Date of birth' }).uncheck();
  await page.getByRole('checkbox', { name: 'Gender' }).uncheck();
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download spreadsheet/ }).click()]);
  expect(file.suggestedFilename()).toMatch(/^students.*\.csv$/);
  const text = (await (await import('node:fs/promises')).readFile(await file.path(), 'utf8')).replace(/^﻿/, '');
  expect(text.split('\n')[0]).not.toContain('Date of birth'); expect(text.split('\n')[0]).toContain('Admission No');

  // attendance has dates and a day-by-day layout
  await page.getByRole('tab', { name: 'Student attendance' }).click();
  await expect(page.getByLabel('From date')).toBeVisible(); await expect(page.getByLabel('To date')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Attendance %' })).toBeVisible();
  await page.getByLabel('Layout').selectOption({ label: 'Day by day' });
  await expect(page.getByRole('columnheader', { name: 'Date', exact: true })).toBeVisible();

  // teachers and staff
  await page.getByRole('tab', { name: 'Employee profiles' }).click();
  await page.getByRole('combobox', { name: 'Group' }).selectOption({ label: 'Teaching staff' });
  await expect(page.getByRole('columnheader', { name: 'Designation' })).toBeVisible();
  await page.getByRole('tab', { name: 'Payroll and salaries' }).click();
  await expect(page.getByLabel('From month')).toBeVisible();
  expect(problems.filter((p) => !/HTTP 4\d\d/.test(p))).toEqual([]);
});

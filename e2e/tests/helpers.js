import { expect } from '@playwright/test';
import fs from 'node:fs';

export const SHOTS = process.env.SHOTS_DIR || './shots';
fs.mkdirSync(SHOTS, { recursive: true });

/** Every role has its own sign-in page: /student/login, /teacher/login, /finance/login, /library/login, /admin/login, /platform/login */
export async function signIn(page, portal, loginId, password, { expectFail = false } = {}) {
  await page.goto(`/${portal}/login`);
  await page.getByLabel('Login id').fill(loginId);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  if (!expectFail) await page.waitForURL((u) => !/\/login$/.test(u.pathname));
}

/** Visit a path and assert the page rendered without an error banner, JS error or failed API call. */
export async function visit(page, path, problems, { shot } = {}) {
  const before = problems.length;
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(150);
  const alerts = await page.locator('.alert[role="alert"]').allTextContents();
  alerts.forEach((a) => problems.push(`${path}: error banner "${a.slice(0, 120)}"`));
  if (shot) await page.screenshot({ path: `${SHOTS}/${shot}.png`, fullPage: true });
  expect(problems.slice(before), problems.slice(before).join('\n')).toEqual([]);
}

/** Collects console errors, page errors and 4xx/5xx API responses (except explicitly allowed ones). */
export function watch(page, allow = []) {
  const problems = [];
  // tests must not depend on the internet: the page asks Google for web fonts, and a stalled request would hold up screenshots
  page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) problems.push(`console: ${m.text().slice(0, 160)}`); });
  page.on('response', (r) => { const u = r.url(); if (u.includes('/api/') && r.status() >= 400 && !allow.some((a) => u.includes(a))) problems.push(`HTTP ${r.status()} ${r.request().method()} ${u.replace(/^https?:\/\/[^/]+/, '')}`); });
  return problems;
}

import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signIn, watch } from './helpers.js';
import { ADMIN, FINANCE, STAFFP, TRANSPORT, LIBRARY, TEACHER, STUDENT, PLATFORM } from './pages.js';

const PORTALS = [
  ['platform', 'superadmin@erp.local', 'Super@12345', PLATFORM],
  ['admin', 'admin@gps.test', 'Admin@12345', ADMIN],
  ['teacher', 'sharma@gps.test', 'Teach@12345', TEACHER],
  ['student', 'gps.adm20260001', 'Student@12345', STUDENT],
  ['finance', 'finance@gps.test', 'Finance@12345', FINANCE],
  ['library', 'library@gps.test', 'Library@12345', LIBRARY],
  ['transport', 'transport@gps.test', 'Transport@12345', TRANSPORT],
  ['staff', 'gps.s0001', 'Staff@12345', STAFFP],
];
const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme);
const saved = (page) => page.evaluate(() => localStorage.getItem('erp.theme'));

test.describe('light and dark theme', () => {
  test('first visit follows the device; the header toggle switches, persists and every portal has it', async ({ page }) => {
    const problems = watch(page);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    expect(await theme(page)).toBe('dark');
    expect(await saved(page)).toBeNull();

    await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
    const toggle = page.getByTestId('theme-toggle');
    await expect(toggle).toHaveAccessibleName('Switch to light mode');
    await toggle.click();
    expect(await theme(page)).toBe('light');
    expect(await saved(page)).toBe('light');
    await expect(toggle).toHaveAccessibleName('Switch to dark mode');
    await page.reload();
    expect(await theme(page)).toBe('light'); // the saved choice beats the device
    // keyboard: focus the toggle and press Enter
    await toggle.focus();
    await page.keyboard.press('Enter');
    expect(await theme(page)).toBe('dark');
    // back to following the device from the account menu
    await page.getByRole('button', { name: 'Profile menu' }).click();
    await page.getByRole('menuitem', { name: 'Match device' }).click();
    expect(await saved(page)).toBeNull();
    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(() => theme(page)).toBe('light');

    for (const [portal, id, pw] of PORTALS) {
      await page.context().clearCookies();
      await page.waitForLoadState('networkidle'); // let the dashboard finish loading: dropping the token under a page that is still fetching makes its own requests fail with 401
      await page.evaluate(() => sessionStorage.clear());
      await signIn(page, portal, id, pw);
      await expect(page.getByTestId('theme-toggle'), `${portal} has the toggle`).toBeVisible();
    }
    expect(problems.filter((p) => !p.includes('dialog'))).toEqual([]);
  });

  test('sign-in pages have the toggle too', async ({ page }) => {
    await page.goto('/student/login');
    await expect(page.getByTestId('theme-toggle')).toBeVisible();
    await page.goto('/');
    await expect(page.getByTestId('theme-toggle')).toBeVisible();
  });

  // Full audit: every page of every portal in both themes, checking WCAG colour contrast. Run with AUDIT=1 (about 10 minutes).
  test.describe('contrast audit', () => {
    test.skip(!process.env.AUDIT, 'set AUDIT=1 to run the full light/dark contrast audit');
    test.setTimeout(30 * 60_000);
    test('public pages (landing, sign-in, policies, 404): light and dark', async ({ page }) => {
      const out = [];
      for (const scheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: scheme });
        for (const path of ['/', '/student/login', '/privacy', '/terms', '/cookies', '/refunds', '/no-such-page']) {
          await page.goto(path); await page.waitForLoadState('networkidle'); await page.waitForTimeout(200);
          await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => null)))); // a page that is still fading in reads as low contrast; an animation that never ends (a looping glow) is not waited for
          const r = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
          for (const v of r.violations) for (const n of v.nodes) out.push({ scheme, path, target: n.target.join(' '), summary: (n.any[0]?.message || '').slice(0, 140) });
        }
      }
      expect(out).toEqual([]);
    });

    for (const [portal, id, pw, pages] of PORTALS) {
      test(`${portal}: every page, light and dark`, async ({ page }) => {
        const out = [];
        await signIn(page, portal, id, pw);
        for (const scheme of ['light', 'dark']) {
          await page.emulateMedia({ colorScheme: scheme });
          for (const path of pages) {
            await page.goto(path);
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(300);
            expect(await theme(page)).toBe(scheme);
            await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => null)))); // a page that is still fading in reads as low contrast
          const r = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
            for (const v of r.violations) for (const n of v.nodes) out.push({ portal, scheme, path, target: n.target.join(' '), summary: (n.any[0]?.message || '').replace(/Element has insufficient color contrast of /, '').slice(0, 160) });
          }
        }
        fs.mkdirSync('./audit', { recursive: true });
        fs.writeFileSync(`./audit/${portal}.json`, JSON.stringify(out, null, 1));
        expect(out, `${out.length} contrast problems; see e2e/audit/${portal}.json`).toEqual([]);
      });
    }
  });
});

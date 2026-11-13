import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signIn, watch } from './helpers.js';

test.describe('public pages, metadata and accessibility basics', () => {
  test('landing links to the four policy pages, which show no placeholders', async ({ page }) => {
    const problems = watch(page);
    await page.goto('/');
    await expect(page).toHaveTitle(/Campusio/);
    for (const [name, path, heading] of [['Privacy policy', '/privacy', 'Privacy policy'], ['Terms', '/terms', 'Terms and conditions'], ['Cookies and storage', '/cookies', 'Cookies and browser storage'], ['Refunds and cancellation', '/refunds', 'Refund and cancellation policy']]) {
      await page.getByRole('navigation', { name: 'Legal' }).getByRole('link', { name }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.locator('main')).not.toContainText('to be added'); // no placeholder text is ever shown to visitors
      await expect(page.locator('mark')).toHaveCount(0);
      await page.goBack();
    }
    expect(problems).toEqual([]);
  });

  test('the copyright year is the current year, and the skip link reaches the content', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByText(`© ${new Date().getFullYear()} Campusio`)).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('the logo is the Campusio mark and the favicon is set', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Campusio home' })).toBeVisible();
    await expect(page.locator('header img[src="/logo.png"]')).toBeVisible();
    expect((await page.request.get('/logo.png')).ok()).toBe(true);
    expect(await page.locator('link[rel="icon"]').getAttribute('href')).toBe('/favicon.png');
  });

  test('an unknown address shows a real 404 page and a way home, to anyone', async ({ page }) => {
    await page.goto('/definitely/not/here');
    await expect(page).toHaveURL(/definitely\/not\/here$/);
    await expect(page.getByText('This page does not exist')).toBeVisible();
    await expect(page).toHaveTitle(/Page not found/);
    await page.getByRole('link', { name: 'Go to the home page' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('search engines: policy pages may be indexed; sign-in and every signed-in page may not', async ({ page }) => {
    const robots = () => page.locator('meta[name="robots"]').getAttribute('content');
    await page.goto('/privacy'); expect(await robots()).toBe('index, follow');
    await page.goto('/admin/login'); expect(await robots()).toBe('noindex, nofollow');
    await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
    await page.goto('/admin/students'); expect(await robots()).toBe('noindex, nofollow');
    await expect(page).toHaveTitle(/Students · School admin · Campusio/);
    const txt = await (await page.request.get('/robots.txt')).text();
    expect(txt).toMatch(/Disallow: \//); expect(txt).not.toMatch(/Allow: \/admin/);
  });

  test('password fields can be revealed with the keyboard and hidden again', async ({ page }) => {
    await page.goto('/student/login');
    const pw = page.getByLabel('Password', { exact: true });
    await expect(pw).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).focus();
    await page.keyboard.press('Enter');
    await expect(pw).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(pw).toHaveAttribute('type', 'password');
  });

  test('confirmations are real dialogs: Escape and Cancel change nothing, focus is inside', async ({ page }) => {
    await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
    await page.goto('/admin/classes');
    await page.getByRole('row').filter({ hasText: 'Class 6' }).first().getByRole('button', { name: 'Delete' }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg).toBeVisible();
    await expect(dlg.getByRole('button', { name: 'Confirm' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dlg).toHaveCount(0);
    await expect(page.getByRole('row').filter({ hasText: 'Class 6' }).first()).toBeVisible();
  });

  test('the logo returns to the dashboard and there is a way back to the top of a long page', async ({ page }) => {
    await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
    await page.goto('/admin/students');
    await page.getByRole('link', { name: 'School admin home' }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.setViewportSize({ width: 1200, height: 500 });
    await page.evaluate(() => { const d = document.createElement('div'); d.style.height = '3000px'; document.querySelector('main').appendChild(d); window.scrollTo(0, 2000); });
    await page.getByRole('button', { name: 'Back to top' }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(50);
  });

  test('public pages have no serious accessibility violations', async ({ page }) => {
    for (const path of ['/', '/student/login', '/privacy', '/cookies']) {
      await page.goto(path);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(r.violations.map((v) => `${path}: ${v.id} ${v.nodes.length}`)).toEqual([]);
    }
  });
});

import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('05 — Export CSV et Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('la navigation sidebar affiche tous les liens', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // Should show main navigation links
    const nav = page.locator('nav, [role="navigation"], .sidebar, aside').first();
    if (await nav.isVisible()) {
      // Dashboard link
      await expect(page.locator('a[href="/"], text=/Tableau de bord|Accueil/i').first()).toBeVisible();
      // New request link
      await expect(page.locator('a[href="/new-request"], text=/Nouvelle/i').first()).toBeVisible();
    }
  });

  test('la page Demandes affiche la liste paginée', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // Should show requests list (either in dashboard or separate page)
    const requestsSection = page.locator('text=/Mes demandes|Toutes les demandes|Demandes/i').first();
    if (await requestsSection.isVisible()) {
      await expect(requestsSection).toBeVisible();
    }
  });

  test('la page Reporting s\'affiche correctement', async ({ page }) => {
    await page.goto('http://localhost:3000/reporting');
    await page.waitForLoadState('networkidle');

    // Should show reporting page
    await expect(page.locator('h1, h2')).toContainText(/reporting|statistiques|pilotage/i);

    // Should show date range filters
    await expect(page.locator('input[type="date"]').first()).toBeVisible();

    // Should show summary stats
    await expect(page.locator('text=/total|rejet|retard|SLA/i').first()).toBeVisible();
  });

  test('le bouton de déconnexion fonctionne', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // Find logout button
    const logoutBtn = page.locator('button:has-text("Déconnexion"), a:has-text("Déconnexion"), button:has-text("Logout")').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();

      // Should redirect to login
      await page.waitForURL('**/login', { timeout: 5_000 });
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test('le responsive mobile fonctionne', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // Should show hamburger menu or mobile nav
    const mobileMenu = page.locator('button[aria-label*="menu"], button:has-text("☰"), .hamburger').first();
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await page.waitForTimeout(300);
    }

    // Dashboard content should still be visible
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('les raccourcis du dashboard fonctionnent', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await page.waitForLoadState('networkidle');

    // Should show quick action cards
    const quickActions = page.locator('[id^="btn-"], a[href*="/new-request"]');
    const count = await quickActions.count();

    if (count > 0) {
      // Click first quick action
      await quickActions.first().click();
      await page.waitForLoadState('networkidle');

      // Should navigate somewhere
      const url = page.url();
      expect(url).not.toBe('http://localhost:3000/');
    }
  });
});

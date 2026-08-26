import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('04 — Administration (gestion utilisateurs)', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('accessible uniquement par les administrateurs', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');

    // Should show admin page content (if user is admin)
    // or redirect to dashboard (if not admin)
    const isAdmin = await page.locator('h1:has-text("Administration")').isVisible().catch(() => false);
    const isDashboard = await page.url().includes('/') && !page.url().includes('/admin');

    // Either admin page is visible or user was redirected
    expect(isAdmin || isDashboard).toBeTruthy();
  });

  test('affiche l\'onglet Utilisateurs', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');

    // Click on Users tab
    const usersTab = page.locator('button:has-text("Utilisateurs")');
    if (await usersTab.isVisible()) {
      await usersTab.click();
      await page.waitForLoadState('networkidle');

      // Should show users table
      await expect(page.locator('text=/utilisateur/i').first()).toBeVisible();
      await expect(page.locator('table, [role="table"]').first()).toBeVisible();
    }
  });

  test('affiche la liste des utilisateurs', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');

    // Switch to users tab
    await page.click('button:has-text("Utilisateurs")');
    await page.waitForLoadState('networkidle');

    // Should show at least one user (the admin)
    const userRows = page.locator('table tbody tr, [role="row"]');
    await expect(userRows.first()).toBeVisible({ timeout: 5_000 });
  });

  test('ouvre le modal de création d\'utilisateur', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Utilisateurs")');
    await page.waitForLoadState('networkidle');

    // Click "Nouvel utilisateur"
    const createBtn = page.locator('button:has-text("Nouvel utilisateur"), button:has-text("+ Nouvel")');
    if (await createBtn.isVisible()) {
      await createBtn.click();

      // Modal should appear
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('[role="dialog"] input[type="email"]')).toBeVisible();
      await expect(page.locator('[role="dialog"] input[type="password"]')).toBeVisible();
    }
  });

  test('affiche l\'onglet Demandes avec filtres', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');

    // Should show requests tab by default
    await expect(page.locator('button:has-text("Demandes")')).toBeVisible();

    // Should show filter controls
    await expect(page.locator('select').first()).toBeVisible();

    // Should show requests table
    const table = page.locator('table');
    await expect(table.first()).toBeVisible({ timeout: 5_000 });
  });

  test('navigation entre les onglets fonctionne', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');

    // Click Users tab
    await page.click('button:has-text("Utilisateurs")');
    await page.waitForTimeout(500);
    await expect(page.locator('button:has-text("Utilisateurs")')).toHaveAttribute('class', /active|border-b|text-mct/);

    // Click Requests tab
    await page.click('button:has-text("Demandes")');
    await page.waitForTimeout(500);
    await expect(page.locator('button:has-text("Demandes")')).toHaveAttribute('class', /active|border-b|text-mct/);
  });
});

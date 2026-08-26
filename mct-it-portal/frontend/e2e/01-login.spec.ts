import { test, expect } from '@playwright/test';
import { login, waitForPageReady, TEST_USER } from './helpers';

test.describe('01 — Connexion et Dashboard', () => {

  test('redirige vers /login si non authentifié', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    // Should redirect to login
    await page.waitForURL('**/login', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('affiche le formulaire de connexion', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1, h2')).toContainText(/connexion|login|connect/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('refuse les identifiants invalides', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', 'wrong@email.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error toast or message
    await expect(page.locator('text=/erreur|incorrect|invalid/i').first()).toBeVisible({ timeout: 5_000 });
  });

  test('connecte et affiche le dashboard', async ({ page }) => {
    await login(page);

    // Should be on dashboard
    await expect(page).toHaveURL('http://localhost:3000/');

    // Should show greeting with user name
    await expect(page.locator('text=/Bonjour|Bon après-midi|Bonsoir/i').first()).toBeVisible();

    // Should show "Nouvelle demande" button
    await expect(page.locator('#btn-new-request, text=/Nouvelle demande/i').first()).toBeVisible();

    // Should show stat cards
    await expect(page.locator('text=/Mes demandes|Dossiers visibles/i').first()).toBeVisible();
  });

  test('navigation vers nouvelles demandes fonctionne', async ({ page }) => {
    await login(page);

    await page.click('#btn-new-request, text=/Nouvelle demande/i');
    await page.waitForURL('**/new-request', { timeout: 5_000 });

    await expect(page).toHaveURL(/\/new-request/);
    await expect(page.locator('h1, h2')).toContainText(/nouvelle demande/i);
  });
});

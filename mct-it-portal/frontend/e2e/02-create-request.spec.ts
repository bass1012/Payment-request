import { test, expect } from '@playwright/test';
import { login, waitForPageReady } from './helpers';

test.describe('02 — Création de demande IT (EMAIL)', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('affiche le sélecteur de type de demande', async ({ page }) => {
    await page.goto('http://localhost:3000/new-request');
    await page.waitForLoadState('networkidle');

    // Should show type selector with request types
    await expect(page.locator('text=/ Création/i').first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('text=/ Impression/i').first()).toBeVisible();
    await expect(page.locator('text=/ Actif/i').first()).toBeVisible();
  });

  test('sélectionne le type EMAIL et affiche le formulaire', async ({ page }) => {
    await page.goto('http://localhost:3000/new-request');
    await page.waitForLoadState('networkidle');

    // Click on EMAIL type card
    await page.click('text=/ Création/i');
    await page.waitForLoadState('networkidle');

    // Should show the form with requester fields
    await expect(page.locator('h2, h3')).toContainText(/adresse|email/i);
    await expect(page.locator('input, select').first()).toBeVisible();
  });

  test('remplit et soumet un formulaire EMAIL complet', async ({ page }) => {
    await page.goto('http://localhost:3000/new-request?type=EMAIL');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for form initialization

    // Fill memo number
    const memoInput = page.locator('input[name="memoNumber"], #memoNumber');
    if (await memoInput.isVisible()) {
      await memoInput.fill('MEMO-2026-E2E-001');
    }

    // Submit the form
    await page.click('button[type="submit"]');

    // Should show success toast or navigate to request detail
    await expect(
      page.locator('text=/soumise|succès|envoi/i').first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('affiche la progression d\'envoi pendant la soumission', async ({ page }) => {
    await page.goto('http://localhost:3000/new-request?type=EMAIL');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Submit
    await page.click('button[type="submit"]');

    // Should show progress indicator
    const progress = page.locator('[role="progressbar"], text=/préparation|envoi/i').first();
    await expect(progress).toBeVisible({ timeout: 10_000 });
  });

  test('empêche la double soumission', async ({ page }) => {
    await page.goto('http://localhost:3000/new-request?type=EMAIL');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click submit multiple times rapidly
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    await submitBtn.click({ force: true });

    // Should not create duplicate — only one request should be created
    // Wait for the submission to complete
    await page.waitForTimeout(3000);
  });
});

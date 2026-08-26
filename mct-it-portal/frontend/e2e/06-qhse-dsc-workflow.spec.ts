import { test, expect } from '@playwright/test';
import { login, loginViaAPI, waitForPageReady } from './helpers';

const API_URL = 'http://localhost:3001';
const BASE_URL = 'http://localhost:3000';

test.describe('06 — Circuit QHSE avec étape DSC', () => {

  test('le circuit EMAIL pour QHSE affiche DSC avant DGOF', async ({ page, request }) => {
    // 1. Login via API to get token for creating a request
    const loginRes = await loginViaAPI(request);
    const { token } = loginRes;

    // 2. Create an EMAIL request for QHSE department via API
    const createRes = await request.post(`${API_URL}/api/requests`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        type: 'EMAIL',
        department: 'QHSE',
        memoNumber: 'E2E-QHSE-DSC-001',
        requestReason: 'Test E2E — validation du circuit DSC pour QHSE',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const requestData = await createRes.json();
    const requestId = requestData.id;

    // 3. Login via UI
    await login(page);

    // 4. Navigate to the request detail page
    await page.goto(`${BASE_URL}/requests/${requestId}`);
    await page.waitForLoadState('networkidle');
    await waitForPageReady(page);

    // 5. Verify the workflow panel is visible
    const workflowPanel = page.locator('text=Circuit de validation');
    await expect(workflowPanel).toBeVisible({ timeout: 10_000 });

    // 6. Check that the workflow steps include DSC
    const stepLabels = page.locator('.lg\\:col-span-1 h3');
    const steps = await stepLabels.allTextContents();

    // Expected steps for QHSE EMAIL:
    // requester → chef_dept → rh → dsc → dgof → dg → it
    const dscStep = steps.find(s => s.includes('Supply Chain') || s.includes('DSC'));
    expect(dscStep).toBeTruthy();

    // Find DSC and DGOF positions
    const dscIndex = steps.findIndex(s => s.includes('Supply Chain') || s.includes('DSC'));
    const dgofIndex = steps.findIndex(s => s.includes('DGOF'));

    // DSC must appear before DGOF
    expect(dscIndex).toBeGreaterThanOrEqual(0);
    expect(dgofIndex).toBeGreaterThanOrEqual(0);
    expect(dscIndex).toBeLessThan(dgofIndex);

    // 7. Verify DGOF appears after DSC
    const dgStep = steps.findIndex(s => s.includes('Direction Générale'));
    expect(dgStep).toBeGreaterThan(dgofIndex);

    // 8. Verify the full step sequence
    expect(steps).toEqual([
      expect.stringContaining('demandeur'),
      expect.stringContaining('QHSE'),
      expect.stringContaining('Ressources Humaines'),
      expect.stringContaining('Supply Chain'),
      expect.stringContaining('DGOF'),
      expect.stringContaining('Direction Générale'),
    ]);

    // Cleanup: cancel the test request
    await request.post(`${API_URL}/api/requests/${requestId}/cancel`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  test('le circuit EMAIL pour un département non-DG ne PAS afficher DSC', async ({ page, request }) => {
    // 1. Login via API
    const loginRes = await loginViaAPI(request);
    const { token } = loginRes;

    // 2. Create an EMAIL request for FLUIDE_1 (DO direction, non-DG)
    const createRes = await request.post(`${API_URL}/api/requests`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        type: 'EMAIL',
        department: 'FLUIDE_1',
        memoNumber: 'E2E-FLUIDE-NODSC-001',
        requestReason: 'Test E2E — vérification absence DSC pour DO',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const requestData = await createRes.json();
    const requestId = requestData.id;

    // 3. Login via UI
    await login(page);

    // 4. Navigate to the request detail page
    await page.goto(`${BASE_URL}/requests/${requestId}`);
    await page.waitForLoadState('networkidle');
    await waitForPageReady(page);

    // 5. Verify workflow steps
    const workflowPanel = page.locator('text=Circuit de validation');
    await expect(workflowPanel).toBeVisible({ timeout: 10_000 });

    const stepLabels = page.locator('.lg\\:col-span-1 h3');
    const steps = await stepLabels.allTextContents();

    // Should NOT contain DSC for DO direction
    const dscStep = steps.find(s => s.includes('Supply Chain') || s.includes('DSC'));
    expect(dscStep).toBeFalsy();

    // Should contain director (DO) instead
    const directorStep = steps.find(s => s.includes('Direction des Opérations'));
    expect(directorStep).toBeTruthy();

    // Cleanup
    await request.post(`${API_URL}/api/requests/${requestId}/cancel`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });
});

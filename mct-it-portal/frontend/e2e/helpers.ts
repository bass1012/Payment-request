import { type Page, type expect as Expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

/** Test user credentials (created by seed) */
export const TEST_USER = {
  email: 'admin@mct.ci',
  password: 'password123',
  firstName: 'Admin',
  lastName: 'MCT',
};

export const TEST_EMPLOYEE = {
  email: 'employee@mct.ci',
  password: 'password123',
};

/**
 * Login via the UI login form
 */
export async function login(page: Page, email = TEST_USER.email, password = TEST_USER.password) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForURL('**/');
  await page.waitForLoadState('networkidle');
}

/**
 * Login via API directly (faster for setup)
 */
export async function loginViaAPI(
  request: import('@playwright/test').APIRequestContext,
  email = TEST_USER.email,
  password = TEST_USER.password,
) {
  const response = await request.post(`${API_URL}/api/auth/login`, {
    data: { email, password },
  });
  return response.json();
}

/**
 * Register a new test user via API
 */
export async function registerTestUser(
  request: import('@playwright/test').APIRequestContext,
  email: string,
  password = 'password123',
) {
  const response = await request.post(`${API_URL}/api/auth/register`, {
    data: {
      firstName: 'Test',
      lastName: 'E2E',
      email,
      password,
    },
  });
  return response.json();
}

/**
 * Create a request via API
 */
export async function createRequestViaAPI(
  request: import('@playwright/test').APIRequestContext,
  token: string,
  data: Record<string, unknown>,
) {
  const response = await request.post(`${API_URL}/api/requests`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  return response.json();
}

/**
 * Wait for the page to be fully loaded (no spinners)
 */
export async function waitForPageReady(page: Page) {
  await page.waitForLoadState('networkidle');
  // Wait for any loading spinners to disappear
  await page.waitForFunction(() => {
    const spinners = document.querySelectorAll('.animate-spin');
    return spinners.length === 0;
  }, { timeout: 10_000 }).catch(() => {});
}

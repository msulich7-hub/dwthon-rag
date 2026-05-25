import { expect, test } from '@playwright/test';
import { login } from '@open-mercato/core/helpers/integration/auth';
import {
  KIOSK_ASSY_URL,
  presetKioskClientStorage,
} from './helpers/kioskStorage';

/**
 * TC-MES-KIOSK-001: Kiosk shell, demo banner, onboarding
 * Source: .ai/qa/scenarios/TC-MES-KIOSK-001-kiosk-shell-onboarding.md
 */
test.describe('TC-MES-KIOSK-001: Kiosk shell and onboarding', () => {
  test.setTimeout(45_000);

  test('shows fullscreen shell, demo banner, and now card on ASSY nest', async ({ page }) => {
    await presetKioskClientStorage(page, { skipOnboarding: true });
    await login(page, 'admin');
    await page.goto(KIOSK_ASSY_URL);

    await expect(page.getByTestId('mes-kiosk-shell')).toBeVisible();
    await expect(page.getByTestId('mes-kiosk-demo-banner')).toBeVisible();
    await expect(page.getByTestId('mes-kiosk-now-card')).toBeVisible();
    await expect(page.getByTestId('mes-kiosk-scan-input')).toBeVisible();
    await expect(page.getByText('Assembly A')).toBeVisible();
    await expect(page.getByText('WC-ASSY-01')).toBeVisible();
  });

  test('onboarding can be skipped and does not reappear', async ({ page }) => {
    await presetKioskClientStorage(page, { skipOnboarding: false });
    await login(page, 'admin');
    await page.goto(KIOSK_ASSY_URL);

    await expect(page.getByTestId('mes-kiosk-onboarding')).toBeVisible();
    await page.getByTestId('mes-kiosk-onboard-skip').click();
    await expect(page.getByTestId('mes-kiosk-onboarding')).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('mes-kiosk-onboarding')).toHaveCount(0);
    await expect(page.getByTestId('mes-kiosk-now-card')).toBeVisible();
  });

  test('plan strip expands from collapsed default', async ({ page }) => {
    await presetKioskClientStorage(page);
    await login(page, 'admin');
    await page.goto(KIOSK_ASSY_URL);

    await expect(page.getByTestId('mes-kiosk-plan-strip')).toHaveCount(0);
    await page.getByTestId('mes-kiosk-plan-toggle').click();
    await expect(page.getByTestId('mes-kiosk-plan-strip')).toBeVisible();
  });
});

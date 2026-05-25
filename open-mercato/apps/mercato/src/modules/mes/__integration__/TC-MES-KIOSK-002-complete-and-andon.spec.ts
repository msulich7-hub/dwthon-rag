import { expect, test } from '@playwright/test';
import { login } from '@open-mercato/core/helpers/integration/auth';
import { KIOSK_ASSY_URL, presetKioskClientStorage } from './helpers/kioskStorage';

/**
 * TC-MES-KIOSK-002: Complete flow with confirm dialog; Andon reasons
 * Source: .ai/qa/scenarios/TC-MES-KIOSK-002-kiosk-complete-andon.md
 */
test.describe('TC-MES-KIOSK-002: Complete and Andon', () => {
  test.setTimeout(60_000);

  test('complete step 10 unlocks step 20 after confirmation', async ({ page }) => {
    await presetKioskClientStorage(page);
    await login(page, 'admin');
    await page.goto(KIOSK_ASSY_URL);

    await expect(page.getByTestId('mes-kiosk-complete-demo')).toBeVisible();
    await page.getByTestId('mes-kiosk-complete-demo').click();
    await expect(page.getByTestId('mes-kiosk-complete-dialog')).toBeVisible();
    await page.getByTestId('mes-kiosk-confirm-complete').click();
    await expect(page.getByTestId('mes-kiosk-complete-dialog')).toHaveCount(0);

    await expect(page.getByText('Fit control module')).toBeVisible();
    await expect(page.getByTestId('mes-kiosk-start-demo')).toBeVisible();
  });

  test('andon dialog records a reason (demo flash)', async ({ page }) => {
    await presetKioskClientStorage(page);
    await login(page, 'admin');
    await page.goto(KIOSK_ASSY_URL);

    await page.getByTestId('mes-kiosk-andon-short').click();
    await expect(page.getByTestId('mes-kiosk-andon-dialog')).toBeVisible();
    await page.getByTestId('mes-kiosk-andon-missing_material').click();
    await expect(page.getByTestId('mes-kiosk-andon-dialog')).toHaveCount(0);
  });

  test('scan by order number highlights and can complete in-progress op', async ({ page }) => {
    await presetKioskClientStorage(page);
    await login(page, 'admin');
    await page.goto(KIOSK_ASSY_URL);

    await page.getByTestId('mes-kiosk-scan-input').fill('WO-2026-1042');
    await page.getByTestId('mes-kiosk-scan-input').press('Enter');
    await expect(page.getByTestId('mes-kiosk-complete-dialog')).toBeVisible();
  });
});

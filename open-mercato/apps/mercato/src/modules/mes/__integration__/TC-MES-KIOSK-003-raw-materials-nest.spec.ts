import { expect, test } from '@playwright/test';
import { login } from '@open-mercato/core/helpers/integration/auth';
import {
  KIOSK_ASSY_URL,
  KIOSK_RAW_MATERIALS_ASSY,
  presetKioskClientStorage,
} from './helpers/kioskStorage';

/**
 * TC-MES-KIOSK-003: Raw materials kiosk + nest change
 * Source: .ai/qa/scenarios/TC-MES-KIOSK-003-raw-materials-nest.md
 */
test.describe('TC-MES-KIOSK-003: Raw materials and nest switch', () => {
  test.setTimeout(60_000);

  test('order materials navigates to replenishment form and returns', async ({ page }) => {
    await presetKioskClientStorage(page);
    await login(page, 'admin');
    await page.goto(KIOSK_ASSY_URL);

    await page.getByTestId('mes-kiosk-order-materials').click();
    await expect(page).toHaveURL(/\/backend\/mes\/operator\/raw-materials\?.*kiosk=1/);
    await expect(page.getByTestId('mes-kiosk-shell')).toBeVisible();
    await expect(page.getByTestId('mes-kiosk-rm-work-order')).toBeVisible();

    await page.getByTestId('mes-kiosk-rm-submit').click();
    await expect(page).toHaveURL(/\/backend\/mes\/operator\?.*kiosk=1.*nest=WC-ASSY-01/);
    await expect(page.getByTestId('mes-kiosk-now-card')).toBeVisible();
  });

  test('service nest change switches to paint cell mock', async ({ page }) => {
    await presetKioskClientStorage(page);
    await login(page, 'admin');
    await page.goto(KIOSK_ASSY_URL);

    await page.getByTestId('mes-kiosk-change-nest').click();
    await page.getByTestId('mes-kiosk-nest-WC-PAINT-02').click();
    await expect(page).toHaveURL(/nest=WC-PAINT-02/);
    await expect(page.getByText('Paint cell')).toBeVisible();
    await expect(page.getByText('WC-PAINT-02')).toBeVisible();
  });

  test('raw materials deep link loads mock BOM lines', async ({ page }) => {
    await presetKioskClientStorage(page);
    await login(page, 'admin');
    await page.goto(KIOSK_RAW_MATERIALS_ASSY);

    await expect(page.getByText('RM-HOUSING-01')).toBeVisible();
    await page.getByTestId('mes-kiosk-rm-back-header').click();
    await expect(page.getByTestId('mes-kiosk-now-card')).toBeVisible();
  });
});

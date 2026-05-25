import type { Page } from '@playwright/test';
import {
  KIOSK_NEST_STORAGE_KEY,
  KIOSK_ONBOARDING_STORAGE_KEY,
  KIOSK_OPS_STORAGE_PREFIX,
  kioskOpsStorageKey,
} from '../../lib/kiosk-planning-view-model';

export type KioskStoragePreset = {
  /** Skip the 3-step onboarding overlay. Default: true */
  skipOnboarding?: boolean;
  /** Persisted nest code in localStorage. Default: WC-ASSY-01 */
  nestCode?: string;
  /** Remove session progress for all kiosk nests. Default: true */
  clearSessionOps?: boolean;
};

/**
 * Resets kiosk client storage before navigation so tests start from mock defaults.
 * Call before `page.goto` on kiosk URLs (via addInitScript).
 */
export async function presetKioskClientStorage(
  page: Page,
  opts: KioskStoragePreset = {},
): Promise<void> {
  const skipOnboarding = opts.skipOnboarding !== false;
  const nestCode = opts.nestCode ?? 'WC-ASSY-01';
  const clearSessionOps = opts.clearSessionOps !== false;

  await page.addInitScript(
    ({ skipOnboarding, nestCode, clearSessionOps, keys }) => {
      if (skipOnboarding) {
        window.localStorage.setItem(keys.onboarding, '1');
      } else {
        window.localStorage.removeItem(keys.onboarding);
      }
      window.localStorage.setItem(keys.nest, nestCode);
      if (clearSessionOps) {
        const toRemove: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i);
          if (k?.startsWith(keys.opsPrefix)) toRemove.push(k);
        }
        toRemove.forEach((k) => window.sessionStorage.removeItem(k));
      }
    },
    {
      skipOnboarding,
      nestCode,
      clearSessionOps,
      keys: {
        onboarding: KIOSK_ONBOARDING_STORAGE_KEY,
        nest: KIOSK_NEST_STORAGE_KEY,
        opsPrefix: KIOSK_OPS_STORAGE_PREFIX,
      },
    },
  );
}

export const KIOSK_ASSY_URL = '/backend/mes/operator?kiosk=1&nest=WC-ASSY-01';
export const KIOSK_RAW_MATERIALS_ASSY =
  '/backend/mes/operator/raw-materials?kiosk=1&nest=WC-ASSY-01';

/** Storage key for a single nest's persisted mock ops (sessionStorage). */
export { kioskOpsStorageKey };
